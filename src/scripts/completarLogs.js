// src/scripts/completarLogs.js
// Genera los registros de auditoría (colección logs) que faltan para los
// movimientos ya existentes en la base de datos.
//
// ¿Por qué es necesario? La auditoría del sistema (RNF05) se implementa a
// nivel de aplicación: la función registrarLog() se ejecuta cuando un
// movimiento entra por la API REST. Los scripts de seed escriben directo en
// MongoDB sin pasar por la API, por lo que sus movimientos quedan sin log.
// Este script detecta esos movimientos y les crea su log correspondiente,
// con el mismo formato de texto que usa la API y la fecha del movimiento.
//
// Uso:
//   npm run seed:logs
//
// Es idempotente: los movimientos que ya tienen log no se tocan, por lo que
// puede ejecutarse las veces que sea necesario.
require('dotenv').config();
const mongoose = require('mongoose');
const Movimiento = require('../models/Movimientos');
const Log = require('../models/Logs');

const TAMANO_LOTE = 1000;

async function completarLogsFaltantes() {
  // Los logs creados por la API guardan detalles.movimientoId: ese es el
  // vínculo que permite saber qué movimientos ya tienen su auditoría.
  const logsExistentes = await Log.find({ 'detalles.movimientoId': { $exists: true } })
    .select('detalles.movimientoId');
  const cubiertos = new Set(logsExistentes.map((l) => String(l.detalles.movimientoId)));

  const movimientos = await Movimiento.find().select('tipo usuarioId fechaHora');
  const faltantes = movimientos.filter((m) => !cubiertos.has(String(m._id)));

  if (faltantes.length === 0) {
    console.log('Todos los movimientos ya tienen su registro de auditoría.');
    return 0;
  }

  const logs = faltantes.map((m) => ({
    usuarioId: m.usuarioId,
    accion: m.tipo === 'ingreso' ? 'Registró un ingreso (1 producto(s))' : 'Registró una salida (1 producto(s))',
    fechaHora: m.fechaHora,
    ip: '127.0.0.1',
    detalles: { movimientoId: m._id }
  }));

  for (let i = 0; i < logs.length; i += TAMANO_LOTE) {
    await Log.insertMany(logs.slice(i, i + TAMANO_LOTE), { ordered: false });
    process.stdout.write(`\r  Logs creados: ${Math.min(i + TAMANO_LOTE, logs.length)}/${logs.length}`);
  }
  console.log('');
  return logs.length;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB');
  console.log('Buscando movimientos sin registro de auditoría...');

  const creados = await completarLogsFaltantes();
  const totalLogs = await Log.countDocuments();
  console.log(`Logs agregados: ${creados} | Total de logs en la base de datos: ${totalLogs}`);

  await mongoose.disconnect();
  console.log('Listo.');
}

module.exports = { completarLogsFaltantes };

if (require.main === module) {
  main().catch((error) => {
    console.error('Error al completar los logs:', error);
    process.exit(1);
  });
}
