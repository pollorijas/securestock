// src/scripts/seedBigData.js
// Llena la base de datos con un volumen de movimientos acorde a lo declarado
// en el informe (objetivo 3.2: al menos 20.000 registros de movimientos con
// consultas de stock inferiores a 1 segundo).
//
// Requisitos previos:
//   1. Usuarios creados (npm run seed y/o desde la aplicación).
//   2. Productos y proveedores creados (npm run seed:datos).
//
// Uso:
//   npm run seed:bigdata
//   MOVIMIENTOS_TOTALES=50000 npm run seed:bigdata   (para otro volumen)
//
// El script es aditivo: cada ejecución agrega movimientos nuevos manteniendo
// el stock consistente (nunca deja stock negativo). Al terminar, mide y
// muestra los tiempos de consulta como evidencia de rendimiento.
require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Proveedor = require('../models/Proveedores');
const Producto = require('../models/Productos');
const Movimiento = require('../models/Movimientos');
const MovimientoDet = require('../models/MovimientoDet');

const MOVIMIENTOS_TOTALES = Number(process.env.MOVIMIENTOS_TOTALES) || 25000;
const DIAS_HISTORICO = Number(process.env.DIAS_HISTORICO) || 30;
const TAMANO_LOTE = 1000; // documentos por insertMany

const DESTINOS = ['Tienda Norte', 'Tienda Sur', 'Tienda Centro', 'Sucursal Valparaíso', 'Bodega Externa', 'Cliente Mayorista'];

function aleatorioEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegirAlAzar(lista) {
  return lista[aleatorioEntre(0, lista.length - 1)];
}

function fechaAleatoria() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - aleatorioEntre(0, DIAS_HISTORICO));
  fecha.setHours(aleatorioEntre(7, 19), aleatorioEntre(0, 59), aleatorioEntre(0, 59), 0);
  // Si cayó "hoy" con una hora que aún no ocurre, se ajusta a minutos recientes
  if (fecha > new Date()) {
    return new Date(Date.now() - aleatorioEntre(1, 120) * 60 * 1000);
  }
  return fecha;
}

// Genera en memoria los documentos de movimientos y detalles, garantizando
// que ninguna salida supere el stock disponible acumulado por producto.
function generarPlan(productos, proveedores, usuarios, total) {
  const movimientos = [];
  const detalles = [];
  // Disponible parte del stock actual que ya tiene cada producto en la BD
  const disponible = {};
  const cambioNeto = {};
  productos.forEach((p) => {
    disponible[p._id.toString()] = p.stockActual || 0;
    cambioNeto[p._id.toString()] = 0;
  });

  for (let i = 0; i < total; i++) {
    const producto = elegirAlAzar(productos);
    const idProducto = producto._id.toString();
    const usuario = elegirAlAzar(usuarios);

    // ~55% ingresos / 45% salidas; si no hay stock, se fuerza un ingreso
    const esSalida = disponible[idProducto] > 0 && Math.random() < 0.45;

    const idMovimiento = new mongoose.Types.ObjectId();
    let cantidad;

    if (esSalida) {
      cantidad = aleatorioEntre(1, Math.min(disponible[idProducto], 40));
      disponible[idProducto] -= cantidad;
      cambioNeto[idProducto] -= cantidad;
      movimientos.push({
        _id: idMovimiento,
        tipo: 'salida',
        destino: elegirAlAzar(DESTINOS),
        fechaHora: fechaAleatoria(),
        usuarioId: usuario._id,
        observaciones: 'Dato de prueba (seedBigData)'
      });
    } else {
      cantidad = aleatorioEntre(20, 250);
      disponible[idProducto] += cantidad;
      cambioNeto[idProducto] += cantidad;
      movimientos.push({
        _id: idMovimiento,
        tipo: 'ingreso',
        proveedorId: elegirAlAzar(proveedores)._id,
        fechaHora: fechaAleatoria(),
        usuarioId: usuario._id,
        observaciones: 'Dato de prueba (seedBigData)'
      });
    }

    detalles.push({
      movimientoId: idMovimiento,
      productoId: producto._id,
      cantidad
    });
  }

  return { movimientos, detalles, cambioNeto };
}

async function insertarPorLotes(Modelo, documentos, etiqueta) {
  for (let i = 0; i < documentos.length; i += TAMANO_LOTE) {
    const lote = documentos.slice(i, i + TAMANO_LOTE);
    await Modelo.insertMany(lote, { ordered: false });
    process.stdout.write(`\r  ${etiqueta}: ${Math.min(i + TAMANO_LOTE, documentos.length)}/${documentos.length}`);
  }
  console.log('');
}

async function medirConsultas() {
  console.log('\nMedición de rendimiento (evidencia para el informe/presentación):');

  let inicio = Date.now();
  const productos = await Producto.find().sort({ nombre: 1 });
  console.log(`  Consulta de stock actual (${productos.length} productos): ${Date.now() - inicio} ms`);

  inicio = Date.now();
  await Movimiento.find().sort({ fechaHora: -1 }).limit(200);
  console.log(`  Historial (últimos 200 movimientos): ${Date.now() - inicio} ms`);

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  inicio = Date.now();
  await MovimientoDet.aggregate([
    { $lookup: { from: 'movimientos', localField: 'movimientoId', foreignField: '_id', as: 'movimiento' } },
    { $unwind: '$movimiento' },
    { $match: { 'movimiento.fechaHora': { $gte: hace30 } } },
    { $group: { _id: '$productoId', totalMovido: { $sum: '$cantidad' } } },
    { $sort: { totalMovido: -1 } },
    { $limit: 5 }
  ]);
  console.log(`  Agregación top 5 productos (30 días): ${Date.now() - inicio} ms`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB');

  // Los movimientos deben quedar a nombre de los operarios, que son quienes
  // los realizan en la operación real. Si aún no existen operarios (no se ha
  // ejecutado seed:trabajadores), se usa cualquier usuario disponible.
  let usuarios = await Usuario.find({ rol: 'operario' });
  if (usuarios.length === 0) {
    usuarios = await Usuario.find({ rol: 'administrador' });
  }
  const [proveedores, productos] = await Promise.all([
    Proveedor.find(),
    Producto.find()
  ]);

  if (usuarios.length === 0 || proveedores.length === 0 || productos.length === 0) {
    console.error('Faltan datos base. Ejecuta primero "npm run seed" (usuarios), "npm run seed:datos" (proveedores) y "npm run seed:trabajadores" (operarios y catálogo).');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Generando ${MOVIMIENTOS_TOTALES} movimientos repartidos en ${DIAS_HISTORICO} días...`);
  const { movimientos, detalles, cambioNeto } = generarPlan(productos, proveedores, usuarios, MOVIMIENTOS_TOTALES);

  await insertarPorLotes(Movimiento, movimientos, 'Movimientos');
  await insertarPorLotes(MovimientoDet, detalles, 'Detalles');

  // Actualiza el stock de cada producto con el cambio neto calculado
  const operaciones = Object.entries(cambioNeto)
    .filter(([, neto]) => neto !== 0)
    .map(([id, neto]) => ({
      updateOne: { filter: { _id: id }, update: { $inc: { stockActual: neto } } }
    }));
  if (operaciones.length > 0) await Producto.bulkWrite(operaciones);
  console.log(`  Stock actualizado en ${operaciones.length} productos`);

  const [totalMov, totalDet] = await Promise.all([
    Movimiento.countDocuments(),
    MovimientoDet.countDocuments()
  ]);
  const stats = await mongoose.connection.db.stats();
  console.log(`\nTotales en la base de datos: ${totalMov} movimientos, ${totalDet} detalles.`);
  console.log(`Tamaño de datos: ${(stats.dataSize / 1024 / 1024).toFixed(1)} MB (+ ${(stats.indexSize / 1024 / 1024).toFixed(1)} MB de índices) de 512 MB disponibles en el plan M0.`);

  await medirConsultas();

  await mongoose.disconnect();
  console.log('\nListo.');
}

module.exports = { generarPlan };

if (require.main === module) {
  main().catch((error) => {
    console.error('Error al generar los datos masivos:', error);
    process.exit(1);
  });
}
