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
        const { fecha, comunidad, formato } = req.body;
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
                const tds = $(row).find('td, th');
                
                // Si la fila tiene al menos 2 columnas
                if (tds.length >= 2) {
                    const col0 = $(tds[0]).text().trim();
                    const nombre = $(tds[1]).text().trim();
                    const telefono = tds.length >= 3 ? $(tds[2]).text().trim() : "Sin teléfono";

                    // Ignorar fila de cabecera o filas vacías
                    if (nombre === "") return;

                    let esCabecera = false;
                    if (formato === 'poloros') {
                        esCabecera = col0 === "No." || nombre.toUpperCase() === "NOMBRE" || col0.toUpperCase().replace(/\./g, '') === "NO";
                    } else {
                        esCabecera = col0 === "N°" || nombre.toUpperCase() === "NOMBRE COMPLETO";
                    }

                    if (esCabecera) return;

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

// 3. Actualizar estado (Asistencia, Entrevistado, Scope) o Datos (Nombre, Comunidad, Telefono)
router.put('/registros/:id', (req, res) => {
    const { id } = req.params;
    const { asistio, entrevistado, scope, nombre, comunidad, telefono } = req.body;

    // Actualizamos solo los campos que vienen en el body (permitiendo false)
    let campos = [];
    let valores = [];

    if (asistio !== undefined) { campos.push("asistio = ?"); valores.push(asistio ? 1 : 0); }
    if (entrevistado !== undefined) { campos.push("entrevistado = ?"); valores.push(entrevistado ? 1 : 0); }
    if (scope !== undefined) { campos.push("scope = ?"); valores.push(scope ? 1 : 0); }
    if (nombre !== undefined) { campos.push("nombre = ?"); valores.push(nombre); }
    if (comunidad !== undefined) { campos.push("comunidad = ?"); valores.push(comunidad); }
    if (telefono !== undefined) { campos.push("telefono = ?"); valores.push(telefono); }

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

// 4. Agregar registro manual (Protegido)
router.post('/registro-manual', (req, res) => {
    const { fecha, comunidad, nombre, telefono, password } = req.body;

    if (password !== '022003') return res.status(401).json({ error: 'Contraseña incorrecta' });
    if (!fecha || !comunidad || !nombre) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    db.run(
        "INSERT INTO registros (comunidad, nombre, telefono, fecha) VALUES (?, ?, ?, ?)",
        [comunidad, nombre, telefono || "Sin teléfono", fecha],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al agregar registro' });
            
            const newRecord = { id: this.lastID, comunidad, nombre, telefono: telefono || "Sin teléfono", fecha, asistio: 0, entrevistado: 0, scope: 0 };
            
            const io = req.app.get('io');
            if (io) io.emit('nuevo_registro', newRecord);

            res.json({ mensaje: 'Agregado correctamente', registro: newRecord });
        }
    );
});

// 5. Eliminar registro (Protegido)
router.delete('/registros/:id', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (password !== '022003') return res.status(401).json({ error: 'Contraseña incorrecta' });

    db.run("DELETE FROM registros WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar registro' });
        
        if (this.changes > 0) {
            const io = req.app.get('io');
            if (io) io.emit('registro_eliminado', id);
            res.json({ mensaje: 'Eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Registro no encontrado' });
        }
    });
});

// 6. Obtener meta del día
router.get('/metas', (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'Falta fecha' });

    db.get("SELECT meta FROM metas WHERE fecha = ?", [fecha], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error al obtener meta' });
        res.json({ meta: row ? row.meta : 0 });
    });
});

// 7. Actualizar meta del día (Protegido)
router.post('/metas', (req, res) => {
    const { fecha, meta, password } = req.body;

    if (password !== '022003') return res.status(401).json({ error: 'Contraseña incorrecta' });
    if (!fecha || meta === undefined) return res.status(400).json({ error: 'Faltan campos' });

    db.run(
        "REPLACE INTO metas (fecha, meta) VALUES (?, ?)",
        [fecha, meta],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al actualizar meta' });
            
            const io = req.app.get('io');
            if (io) io.emit('meta_actualizada', { fecha, meta });

            res.json({ mensaje: 'Meta actualizada' });
        }
    );
});

module.exports = router;