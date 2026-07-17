const Log = require('../models/Logs');

// Guarda un registro de auditoría. No lanza error si falla,
// para no interrumpir la operación principal por un problema de logging.
async function registrarLog(usuarioId, accion, req, detalles) {
  try {
    await Log.create({
      usuarioId,
      accion,
      ip: req.ip,
      detalles
    });
  } catch (error) {
    console.error('No se pudo registrar el log de auditoría:', error.message);
  }
}

module.exports = { registrarLog };
