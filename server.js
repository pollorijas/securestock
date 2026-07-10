// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

// 1. Creamos la aplicación de Express
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares globales (se ejecutan en cada petición)
app.use(helmet());              // Seguridad básica
app.use(cors());                // Permite peticiones desde otros dominios
app.use(express.json());        // Interpreta el cuerpo de las peticiones como JSON (¡IMPORTANTE!)

// 3. Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas correctamente'))
  .catch((error) => console.error('Error al conectar a MongoDB:', error));

// 4. Ruta de prueba (para ver que todo funciona)
app.get('/api/test', (req, res) => {
  res.json({ mensaje: 'La API de SecureStock está funcionando correctamente' });
});

// 5. Importaremos las rutas más adelante (las descomentamos cuando las creemos)
app.use('/api/auth', require('./src/routes/authRoutes'));
// app.use('/api/productos', require('./src/routes/productoRoutes'));

// 6. Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});