require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

// 1. Creamos la aplicación de Express
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares globales (se ejecutan en cada petición)
app.use(helmet({
  contentSecurityPolicy: false // se desactiva para no bloquear el frontend servido desde /public
}));
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

// 5. Rutas de la API
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/productos', require('./src/routes/productoRoutes'));
app.use('/api/proveedores', require('./src/routes/proveedorRoutes'));
app.use('/api/movimientos', require('./src/routes/movimientoRoutes'));
app.use('/api/logs', require('./src/routes/logRoutes'));

// 6. Archivos estáticos del frontend (HTML, CSS y JS)
app.use(express.static(path.join(__dirname, 'public')));

// 7. Manejo de rutas no encontradas dentro de la API
app.use('/api', (req, res) => {
  res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

// 8. Manejo centralizado de errores no controlados
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

// 9. Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});