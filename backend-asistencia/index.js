const express = require("express");
const cors = require("cors");

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

app.set('io', io);

const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.text());


// Import routes

const rutasAsistencia = require("./routes/asistencia");
// Use routes
app.use("/api/asistencia", rutasAsistencia);



// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor de Asistencia funcionando 🚀');
});

// Iniciar el servidor en todas las interfaces para red local
server.listen(port, "0.0.0.0", () => {
    console.log(`Servidor corriendo en red local en el puerto ${port}`);
});