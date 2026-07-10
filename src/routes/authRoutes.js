// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');

// --- RUTA POST /api/auth/registro ---
router.post('/registro',
  // Validaciones con express-validator
  body('nombre').notEmpty().withMessage('Nombre obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  async (req, res) => {
    // 1. Revisar si hay errores de validación
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { nombre, email, password, rol } = req.body;

    try {
      // 2. Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ email });
      if (usuarioExistente) {
        return res.status(400).json({ mensaje: 'El email ya está registrado' });
      }

      // 3. Encriptar la contraseña (bcrypt)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 4. Crear el nuevo usuario en la BD
      const nuevoUsuario = new Usuario({
        nombre,
        email,
        passwordHash,
        rol: rol || 'operario' // Si no envía rol, por defecto es operario
      });
      await nuevoUsuario.save();

      // 5. (Opcional) Responder sin la contraseña
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
      // 1. Buscar al usuario por email
      const usuario = await Usuario.findOne({ email });
      if (!usuario) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      // 2. Comparar la contraseña enviada con el hash guardado
      const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
      if (!passwordValido) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      // 3. Crear el token JWT
      const payload = {
        id: usuario._id,
        email: usuario.email,
        rol: usuario.rol
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

      // 4. Responder con el token y datos del usuario
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

module.exports = router;