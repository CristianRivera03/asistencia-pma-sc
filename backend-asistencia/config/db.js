const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./asistencia_v2.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database (v2)");

    db.run(`CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comunidad TEXT,
            nombre TEXT,
            telefono TEXT,
            asistio BOOLEAN DEFAULT 0,
            entrevistado BOOLEAN DEFAULT 0,
            scope BOOLEAN DEFAULT 0,
            fecha DATE
        )`);

    db.run(`CREATE TABLE IF NOT EXISTS metas (
            fecha DATE PRIMARY KEY,
            meta INTEGER
        )`);
  }
});


module.exports = db;