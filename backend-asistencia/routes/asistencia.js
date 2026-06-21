const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const cheerio = require('cheerio');

// Configuración de multer para subir archivos temporalmente
const upload = multer({ dest: 'uploads/' });

// 1. Cargar Datos desde un DOCX
router.post('/cargar-datos', upload.single('archivo'), async (req, res) => {
    try {
        const { fecha, comunidad } = req.body;
        const archivo = req.file;

        if (!archivo) return res.status(400).json({ error: 'No se proporcionó ningún archivo .docx' });
        if (!fecha || !comunidad) return res.status(400).json({ error: 'Faltan campos obligatorios (fecha o comunidad)' });

        // Extraer DOCX a HTML para poder leer las tablas correctamente
        const { value: html } = await mammoth.convertToHtml({ path: archivo.path });
        
        // Eliminar el archivo temporal
        fs.unlinkSync(archivo.path);

        const $ = cheerio.load(html);
        let insertados = 0;

        const stmt = db.prepare(`INSERT INTO registros (comunidad, nombre, telefono, fecha) VALUES (?, ?, ?, ?)`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Buscar todas las filas de tabla en el HTML generado
            $('tr').each((i, row) => {
                const tds = $(row).find('td');
                
                // Si la fila tiene al menos 2 columnas
                if (tds.length >= 2) {
                    const col0 = $(tds[0]).text().trim();
                    const nombre = $(tds[1]).text().trim();
                    const telefono = tds.length >= 3 ? $(tds[2]).text().trim() : "Sin teléfono";

                    // Ignorar fila de cabecera o filas vacías
                    if (nombre === "" || col0 === "N°" || nombre.toUpperCase() === "NOMBRE COMPLETO") {
                        return;
                    }

                    stmt.run([comunidad, nombre, telefono || "Sin teléfono", fecha]);
                    insertados++;
                }
            });

            db.run("COMMIT", (err) => {
                stmt.finalize();
                if (err) {
                    console.error("Error al guardar:", err.message);
                    return res.status(500).json({ error: 'Error al guardar en la base de datos' });
                } else {
                    res.json({ mensaje: 'Datos guardados exitosamente', total: insertados });
                }
            });
        });

    } catch (error) {
        console.error("Error al procesar el archivo:", error);
        res.status(500).json({ error: 'Error al procesar el documento' });
    }
});

// 2. Obtener registros por fecha
router.get('/registros', (req, res) => {
    const { fecha } = req.query;
    
    if (!fecha) {
        return res.status(400).json({ error: 'Se requiere el parámetro fecha (YYYY-MM-DD)' });
    }

    db.all("SELECT * FROM registros WHERE fecha = ?", [fecha], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error al consultar la base de datos' });
        }
        res.json(rows);
    });
});

// 3. Actualizar estado (Asistencia, Entrevistado, Scope)
router.put('/registros/:id', (req, res) => {
    const { id } = req.params;
    const { asistio, entrevistado, scope } = req.body;

    // Actualizamos solo los campos que vienen en el body (permitiendo false)
    let campos = [];
    let valores = [];

    if (asistio !== undefined) { campos.push("asistio = ?"); valores.push(asistio ? 1 : 0); }
    if (entrevistado !== undefined) { campos.push("entrevistado = ?"); valores.push(entrevistado ? 1 : 0); }
    if (scope !== undefined) { campos.push("scope = ?"); valores.push(scope ? 1 : 0); }

    if (campos.length === 0) return res.status(400).json({ error: 'No hay datos para actualizar' });

    valores.push(id);
    const query = `UPDATE registros SET ${campos.join(", ")} WHERE id = ?`;

    db.run(query, valores, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar el registro' });
        }
        
        if (this.changes > 0) {
            // Obtener el registro actualizado completo para emitirlo por websocket
            db.get("SELECT * FROM registros WHERE id = ?", [id], (err, row) => {
                if (!err && row) {
                    const io = req.app.get('io');
                    if (io) {
                        io.emit('registro_actualizado', row);
                    }
                    res.json({ mensaje: 'Actualizado correctamente', registro: row });
                } else {
                    res.json({ mensaje: 'Actualizado correctamente pero no se pudo leer' });
                }
            });
        } else {
            res.status(404).json({ error: 'Registro no encontrado' });
        }
    });
});

module.exports = router;