const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { registrarLog } = require('../utils/logger');
const { enviarCorreoRecuperacion } = require('../utils/mailer');

// --- RUTA POST /api/auth/registro ---
// Solo un administrador puede crear cuentas de usuario (operario, supervisor o administrador).
router.post('/registro',
  verificarToken,
  verificarRol(['administrador']),
  body('nombre').notEmpty().withMessage('Nombre obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').optional().isIn(['operario', 'supervisor', 'administrador']).withMessage('Rol inválido'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { nombre, email, password, rol } = req.body;

    try {
      const usuarioExistente = await Usuario.findOne({ email });
      if (usuarioExistente) {
        return res.status(400).json({ mensaje: 'El email ya está registrado' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const nuevoUsuario = new Usuario({
        nombre,
        email,
        passwordHash,
        rol: rol || 'operario'
      });
      await nuevoUsuario.save();

      await registrarLog(req.usuario.id, `Registró al usuario ${email} con rol ${nuevoUsuario.rol}`, req);

      res.status(201).json({
        mensaje: 'Usuario registrado exitosamente',
        usuario: {
          id: nuevoUsuario._id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// --- RUTA POST /api/auth/login ---
router.post('/login',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña obligatoria'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { email, password } = req.body;

    try {
      const usuario = await Usuario.findOne({ email });
      if (!usuario) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
      if (!passwordValido) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      const payload = {
        id: usuario._id,
        email: usuario.email,
        rol: usuario.rol
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

      await registrarLog(usuario._id, 'Inició sesión', req);

      res.json({
        mensaje: 'Login exitoso',
        token,
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// --- RUTA GET /api/auth/me ---
// Permite al frontend validar el token guardado y conocer el rol del usuario.
router.get('/me', verificarToken, (req, res) => {
  res.json({ usuario: req.usuario });
});

// --- RUTA POST /api/auth/recuperar ---
// Solicita un enlace de recuperación de contraseña por correo.
router.post('/recuperar',
  body('email').isEmail().withMessage('Email inválido'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { email } = req.body;
    const mensajeGenerico = { mensaje: 'Si el correo está registrado, se enviará un enlace de recuperación' };

    try {
      const usuario = await Usuario.findOne({ email });

      // Se responde el mismo mensaje exista o no el usuario, para no revelar
      // qué correos están registrados en el sistema.
      if (!usuario) {
        return res.json(mensajeGenerico);
      }

      const token = crypto.randomBytes(32).toString('hex');
      usuario.resetToken = token;
      usuario.expiraToken = Date.now() + 60 * 60 * 1000; // 1 hora
      await usuario.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const enlaceReset = `${frontendUrl}/resetear.html?token=${token}`;
      await enviarCorreoRecuperacion(usuario.email, enlaceReset);

      await registrarLog(usuario._id, 'Solicitó recuperación de contraseña', req);

      res.json(mensajeGenerico);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// --- RUTA POST /api/auth/resetear ---
// Cambia la contraseña usando el token recibido por correo.
router.post('/resetear',
  body('token').notEmpty().withMessage('Token obligatorio'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { token, password } = req.body;

    try {
      const usuario = await Usuario.findOne({
        resetToken: token,
        expiraToken: { $gt: Date.now() }
      });

      if (!usuario) {
        return res.status(400).json({ mensaje: 'El token es inválido o ha expirado' });
      }

      const salt = await bcrypt.genSalt(10);
      usuario.passwordHash = await bcrypt.hash(password, salt);
      usuario.resetToken = undefined;
      usuario.expiraToken = undefined;
      await usuario.save();

      await registrarLog(usuario._id, 'Restableció su contraseña', req);

      res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

module.exports = router;
