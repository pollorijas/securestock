const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Movimiento = require('../models/Movimientos');
const MovimientoDet = require('../models/MovimientoDet');
const Producto = require('../models/Productos');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { registrarLog } = require('../utils/logger');

const validarItems = body('items')
  .isArray({ min: 1 }).withMessage('Debe incluir al menos un producto')
  .bail()
  .custom((items) => items.every((item) => item.productoId && Number.isInteger(item.cantidad) && item.cantidad > 0))
  .withMessage('Cada item debe tener productoId y una cantidad entera mayor a 0');

// POST /api/movimientos/ingreso - registra el ingreso de uno o varios productos (operario y administrador)
router.post('/ingreso',
  verificarToken,
  verificarRol(['operario', 'administrador']),
  validarItems,
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { proveedorId, lote, factura, observaciones, items } = req.body;

    try {
      const movimiento = await Movimiento.create({
        tipo: 'ingreso',
        proveedorId,
        lote,
        factura,
        observaciones,
        usuarioId: req.usuario.id
      });

      const detalles = [];
      for (const item of items) {
        // $inc es atómico: si el mismo producto aparece en varias líneas,
        // cada incremento se aplica sobre el valor más reciente en la base de datos.
        const producto = await Producto.findByIdAndUpdate(
          item.productoId,
          { $inc: { stockActual: item.cantidad } },
          { returnDocument: 'after' }
        );
        if (!producto) {
          return res.status(400).json({ mensaje: `Producto ${item.productoId} no existe` });
        }

        const det = await MovimientoDet.create({
          movimientoId: movimiento._id,
          productoId: producto._id,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        });
        detalles.push(det);
      }

      await registrarLog(req.usuario.id, `Registró un ingreso (${items.length} producto(s))`, req, { movimientoId: movimiento._id });

      res.status(201).json({ movimiento, detalles });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// POST /api/movimientos/salida - registra la salida de uno o varios productos (operario y administrador)
router.post('/salida',
  verificarToken,
  verificarRol(['operario', 'administrador']),
  validarItems,
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { destino, observaciones, items } = req.body;

    try {
      // Primero se valida que haya stock suficiente para TODOS los productos
      // antes de descontar nada (RF09). Se suman las cantidades por producto
      // por si el mismo producto aparece en más de una línea del formulario.
      const cantidadTotalPorProducto = {};
      items.forEach((item) => {
        cantidadTotalPorProducto[item.productoId] = (cantidadTotalPorProducto[item.productoId] || 0) + item.cantidad;
      });

      const productos = [];
      for (const item of items) {
        const producto = await Producto.findById(item.productoId);
        if (!producto) {
          return res.status(400).json({ mensaje: `Producto ${item.productoId} no existe` });
        }
        const totalSolicitado = cantidadTotalPorProducto[item.productoId];
        if (producto.stockActual < totalSolicitado) {
          return res.status(400).json({
            mensaje: `Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stockActual}, solicitado: ${totalSolicitado})`
          });
        }
        productos.push(producto);
      }

      const movimiento = await Movimiento.create({
        tipo: 'salida',
        destino,
        observaciones,
        usuarioId: req.usuario.id
      });

      const detalles = [];
      for (let i = 0; i < items.length; i++) {
        const producto = productos[i];

        // $inc es atómico: si el mismo producto aparece en varias líneas,
        // cada descuento se aplica sobre el valor más reciente en la base de datos.
        await Producto.findByIdAndUpdate(producto._id, { $inc: { stockActual: -items[i].cantidad } });

        const det = await MovimientoDet.create({
          movimientoId: movimiento._id,
          productoId: producto._id,
          cantidad: items[i].cantidad,
          precioUnitario: items[i].precioUnitario
        });
        detalles.push(det);
      }

      await registrarLog(req.usuario.id, `Registró una salida (${items.length} producto(s))`, req, { movimientoId: movimiento._id });

      res.status(201).json({ movimiento, detalles });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
);

// GET /api/movimientos/inventario - stock actual de todos los productos (supervisor y administrador)
router.get('/inventario', verificarToken, verificarRol(['supervisor', 'administrador']), async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    const inventario = productos.map((p) => ({
      _id: p._id,
      nombre: p.nombre,
      unidad: p.unidad,
      categoria: p.categoria,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      stockBajo: p.stockActual <= p.stockMinimo
    }));
    res.json(inventario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// GET /api/movimientos - historial con filtros por tipo, producto y rango de fechas.
// Supervisor y administrador ven todos los movimientos; el operario solo los suyos.
router.get('/', verificarToken, verificarRol(['operario', 'supervisor', 'administrador']), async (req, res) => {
  try {
    const { tipo, productoId, fechaInicio, fechaFin } = req.query;
    const filtro = {};

    if (req.usuario.rol === 'operario') filtro.usuarioId = req.usuario.id;
    if (tipo) filtro.tipo = tipo;
    if (fechaInicio || fechaFin) {
      filtro.fechaHora = {};
      if (fechaInicio) filtro.fechaHora.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaHora.$lte = new Date(fechaFin);
    }

    const movimientos = await Movimiento.find(filtro)
      .populate('usuarioId', 'nombre')
      .populate('proveedorId', 'nombre')
      .sort({ fechaHora: -1 })
      .limit(200);

    const movimientoIds = movimientos.map((m) => m._id);
    const detalleFiltro = { movimientoId: { $in: movimientoIds } };
    if (productoId) detalleFiltro.productoId = productoId;

    const detalles = await MovimientoDet.find(detalleFiltro).populate('productoId', 'nombre unidad');

    // Se arma el resultado agrupando los detalles bajo cada movimiento
    const detallesPorMovimiento = {};
    detalles.forEach((det) => {
      const id = det.movimientoId.toString();
      if (!detallesPorMovimiento[id]) detallesPorMovimiento[id] = [];
      detallesPorMovimiento[id].push(det);
    });

    const resultado = movimientos
      .map((m) => ({ ...m.toObject(), detalles: detallesPorMovimiento[m._id.toString()] || [] }))
      .filter((m) => !productoId || m.detalles.length > 0);

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/dashboard - indicadores para el panel principal (supervisor y administrador)
router.get('/dashboard', verificarToken, verificarRol(['supervisor', 'administrador']), async (req, res) => {
  try {
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    // Total de movimientos por día (últimos 7 días)
    const movimientosPorDia = await Movimiento.aggregate([
      { $match: { fechaHora: { $gte: hace7Dias } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaHora' } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top 5 productos con más movimientos (por cantidad total) en los últimos 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const topProductos = await MovimientoDet.aggregate([
      {
        $lookup: {
          from: 'movimientos',
          localField: 'movimientoId',
          foreignField: '_id',
          as: 'movimiento'
        }
      },
      { $unwind: '$movimiento' },
      { $match: { 'movimiento.fechaHora': { $gte: hace30Dias } } },
      { $group: { _id: '$productoId', totalMovido: { $sum: '$cantidad' } } },
      { $sort: { totalMovido: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'productos',
          localField: '_id',
          foreignField: '_id',
          as: 'producto'
        }
      },
      { $unwind: '$producto' },
      { $project: { _id: 0, nombre: '$producto.nombre', totalMovido: 1 } }
    ]);

    // Productos con stock crítico (por debajo o igual al mínimo)
    const stockCritico = await Producto.find({ $expr: { $lte: ['$stockActual', '$stockMinimo'] } })
      .select('nombre stockActual stockMinimo unidad')
      .sort({ stockActual: 1 });

    res.json({ movimientosPorDia, topProductos, stockCritico });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/export - exporta el historial de movimientos en CSV o JSON (supervisor y administrador)
router.get('/export', verificarToken, verificarRol(['supervisor', 'administrador']), async (req, res) => {
  try {
    const { tipo, fechaInicio, fechaFin, formato } = req.query;
    const filtro = {};
    if (tipo) filtro.tipo = tipo;
    if (fechaInicio || fechaFin) {
      filtro.fechaHora = {};
      if (fechaInicio) filtro.fechaHora.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaHora.$lte = new Date(fechaFin);
    }

    const movimientos = await Movimiento.find(filtro)
      .populate('usuarioId', 'nombre')
      .sort({ fechaHora: -1 });

    const movimientoIds = movimientos.map((m) => m._id);
    const detalles = await MovimientoDet.find({ movimientoId: { $in: movimientoIds } }).populate('productoId', 'nombre');

    const detallesPorMovimiento = {};
    detalles.forEach((det) => {
      const id = det.movimientoId.toString();
      if (!detallesPorMovimiento[id]) detallesPorMovimiento[id] = [];
      detallesPorMovimiento[id].push(det);
    });

    const filas = [];
    movimientos.forEach((m) => {
      const dets = detallesPorMovimiento[m._id.toString()] || [];
      dets.forEach((det) => {
        filas.push({
          fecha: m.fechaHora.toISOString(),
          tipo: m.tipo,
          producto: det.productoId ? det.productoId.nombre : '',
          cantidad: det.cantidad,
          usuario: m.usuarioId ? m.usuarioId.nombre : '',
          destino: m.destino || '',
          observaciones: m.observaciones || ''
        });
      });
    });

    await registrarLog(req.usuario.id, `Exportó el historial de movimientos (${formato || 'json'})`, req);

    if (formato === 'csv') {
      const encabezado = 'fecha,tipo,producto,cantidad,usuario,destino,observaciones';
      const cuerpo = filas.map((f) =>
        [f.fecha, f.tipo, f.producto, f.cantidad, f.usuario, f.destino, f.observaciones]
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csv = [encabezado, ...cuerpo].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="movimientos.csv"');
      return res.send(csv);
    }

    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
