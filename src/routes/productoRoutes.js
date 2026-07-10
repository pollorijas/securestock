// src/routes/productoRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Producto = require('../models/Productos');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { registrarLog } = require('../utils/logger');

// GET /api/productos - listado de productos con stock (supervisor y administrador)
router.get('/', verificarToken, verificarRol(['supervisor', 'administrador']), async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// GET /api/productos/basico - listado mínimo (sin stock) para que cualquier
// rol autenticado pueda elegir un producto al registrar un movimiento.
router.get('/basico', verificarToken, async (req, res) => {
  try {
    const productos = await Producto.find().select('nombre unidad').sort({ nombre: 1 });
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// GET /api/productos/:id - un producto específico (supervisor y administrador)
router.get('/:id', verificarToken, verificarRol(['supervisor', 'administrador']), async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// POST /api/productos - crear producto (solo administrador)
router.post('/',
  verificarToken,
  verificarRol(['administrador']),
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('stockMinimo').isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero mayor o igual a 0'),
  body('unidad').notEmpty().withMessage('La unidad es obligatoria'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    try {
      const { nombre, stockMinimo, unidad, categoria, proveedorId } = req.body;
      const producto = await Producto.create({ nombre, stockMinimo, unidad, categoria, proveedorId });

      await registrarLog(req.usuario.id, `Creó el producto ${producto.nombre}`, req);

      res.status(201).json(producto);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre' });
      }
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// PUT /api/productos/:id - actualizar producto (solo administrador)
router.put('/:id',
  verificarToken,
  verificarRol(['administrador']),
  body('stockMinimo').optional().isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero mayor o igual a 0'),
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    try {
      const { nombre, stockMinimo, unidad, categoria, proveedorId } = req.body;
      const producto = await Producto.findByIdAndUpdate(
        req.params.id,
        { nombre, stockMinimo, unidad, categoria, proveedorId },
        { new: true, runValidators: true }
      );

      if (!producto) {
        return res.status(404).json({ mensaje: 'Producto no encontrado' });
      }

      await registrarLog(req.usuario.id, `Actualizó el producto ${producto.nombre}`, req);

      res.json(producto);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// DELETE /api/productos/:id - eliminar producto (solo administrador)
router.delete('/:id', verificarToken, verificarRol(['administrador']), async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await registrarLog(req.usuario.id, `Eliminó el producto ${producto.nombre}`, req);

    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
