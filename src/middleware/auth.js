// src/middleware/auth.js
const jwt = require('jsonwebtoken');

// Verifica que la petición traiga un token JWT válido en el header Authorization
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, rol }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

// Devuelve un middleware que solo deja pasar a los roles indicados
// Uso: verificarRol(['administrador', 'supervisor'])
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tiene permisos para realizar esta acción' });
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
