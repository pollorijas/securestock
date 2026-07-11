// src/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Logs');
const { verificarToken, verificarRol } = require('../middleware/auth');

// GET /api/logs - consulta la auditoría del sistema (solo administrador)
router.get('/', verificarToken, verificarRol(['administrador']), async (req, res) => {
  try {
    const { usuarioId, fechaInicio, fechaFin } = req.query;
    const filtro = {};

    if (usuarioId) filtro.usuarioId = usuarioId;
    if (fechaInicio || fechaFin) {
      filtro.fechaHora = {};
      if (fechaInicio) filtro.fechaHora.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaHora.$lte = new Date(fechaFin);
    }

    const logs = await Log.find(filtro)
      .populate('usuarioId', 'nombre email rol')
      .sort({ fechaHora: -1 })
      .limit(200);

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
