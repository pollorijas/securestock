// src/routes/proveedorRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Proveedor = require('../models/Proveedores');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { registrarLog } = require('../utils/logger');

// GET /api/proveedores - cualquier usuario autenticado puede listarlos
// (se necesitan para elegir el proveedor al registrar un ingreso)
router.get('/', verificarToken, async (req, res) => {
  try {
    const proveedores = await Proveedor.find().sort({ nombre: 1 });
    res.json(proveedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// POST /api/proveedores - crear proveedor (solo administrador)
router.post('/',
  verificarToken,
  verificarRol(['administrador']),
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('rut').notEmpty().withMessage('El RUT es obligatorio'),
  body('direccion').notEmpty().withMessage('La dirección es obligatoria'),
  body('telefono').notEmpty().withMessage('El teléfono es obligatorio'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    try {
      const { nombre, rut, direccion, telefono, email, contacto } = req.body;
      const proveedor = await Proveedor.create({ nombre, rut, direccion, telefono, email, contacto });

      await registrarLog(req.usuario.id, `Creó el proveedor ${proveedor.nombre}`, req);

      res.status(201).json(proveedor);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ mensaje: 'Ya existe un proveedor con ese nombre, RUT o email' });
      }
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// PUT /api/proveedores/:id - actualizar proveedor (solo administrador)
router.put('/:id', verificarToken, verificarRol(['administrador']), async (req, res) => {
  try {
    const { nombre, rut, direccion, telefono, email, contacto } = req.body;
    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      { nombre, rut, direccion, telefono, email, contacto },
      { returnDocument: 'after', runValidators: true }
    );

    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    await registrarLog(req.usuario.id, `Actualizó el proveedor ${proveedor.nombre}`, req);

    res.json(proveedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// DELETE /api/proveedores/:id - eliminar proveedor (solo administrador)
router.delete('/:id', verificarToken, verificarRol(['administrador']), async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndDelete(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    await registrarLog(req.usuario.id, `Eliminó el proveedor ${proveedor.nombre}`, req);

    res.json({ mensaje: 'Proveedor eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
