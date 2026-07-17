// src/scripts/seedTrabajadores.js
// Deja la base de datos coherente con la operación real de la bodega:
//
//   1. Crea 9 trabajadores: 2 supervisores y 7 operarios.
//   2. Completa el catálogo hasta superar los 200 productos distintos y
//      atribuye su creación a los supervisores mediante la colección de
//      auditoría (logs), que es donde el sistema registra quién crea cada
//      producto (RNF05).
//   3. Reasigna los movimientos existentes que no pertenezcan a un operario
//      (por ejemplo, los generados antes a nombre del administrador) para
//      que queden realizados por los 7 operarios.
//
// Requisito previo: proveedores creados (npm run seed:datos).
//
// Uso:
//   npm run seed:trabajadores
//
// La contraseña inicial de los 9 trabajadores se imprime al final (se puede
// cambiar con la variable TRABAJADORES_PASSWORD en el .env).
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');
const Proveedor = require('../models/Proveedores');
const Producto = require('../models/Productos');
const Movimiento = require('../models/Movimientos');
const Log = require('../models/Logs');

const PASSWORD_INICIAL = process.env.TRABAJADORES_PASSWORD || 'Bodega2026!';
const DIAS_HISTORICO = 45;

const TRABAJADORES = [
  { nombre: 'María Soto Vergara', email: 'maria.soto@logisecure.cl', rol: 'supervisor' },
  { nombre: 'Ricardo Fuentes Lagos', email: 'ricardo.fuentes@logisecure.cl', rol: 'supervisor' },
  { nombre: 'Juan Pérez Aravena', email: 'juan.perez@logisecure.cl', rol: 'operario' },
  { nombre: 'Camila Rojas Espinoza', email: 'camila.rojas@logisecure.cl', rol: 'operario' },
  { nombre: 'Pedro González Silva', email: 'pedro.gonzalez@logisecure.cl', rol: 'operario' },
  { nombre: 'Valentina Muñoz Castro', email: 'valentina.munoz@logisecure.cl', rol: 'operario' },
  { nombre: 'Diego Castro Paredes', email: 'diego.castro@logisecure.cl', rol: 'operario' },
  { nombre: 'Francisca Araya Toro', email: 'francisca.araya@logisecure.cl', rol: 'operario' },
  { nombre: 'Matías Herrera Bravo', email: 'matias.herrera@logisecure.cl', rol: 'operario' }
];

function aleatorioEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegirAlAzar(lista) {
  return lista[aleatorioEntre(0, lista.length - 1)];
}

function fechaHistorica() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - aleatorioEntre(1, DIAS_HISTORICO));
  fecha.setHours(aleatorioEntre(7, 19), aleatorioEntre(0, 59), 0, 0);
  return fecha;
}

// --- Catálogo ampliado: se generan variantes realistas por categoría hasta
// --- superar los 200 productos distintos.
function construirCatalogo() {
  const catalogo = [];
  const agregar = (nombre, categoria, unidad, stockMinimo) =>
    catalogo.push({ nombre, categoria, unidad, stockMinimo: aleatorioEntre(...stockMinimo) });

  // Redes
  ['0,5', '1', '2', '3', '5'].forEach((largo) =>
    ['azul', 'gris', 'rojo'].forEach((color) =>
      agregar(`Patch cord Cat6 ${largo}m ${color}`, 'Redes', 'unidades', [20, 50])));
  ['Cat5e', 'Cat6', 'Cat6A'].forEach((cat) =>
    agregar(`Cable UTP ${cat} (caja 305m)`, 'Redes', 'cajas', [5, 15]));
  [8, 16, 24, 48].forEach((p) => agregar(`Switch ${p} puertos`, 'Redes', 'unidades', [3, 10]));
  [8, 16, 24].forEach((p) => agregar(`Switch PoE ${p} puertos`, 'Redes', 'unidades', [2, 8]));
  agregar('Router Wifi AC1200', 'Redes', 'unidades', [5, 15]);
  agregar('Router Wifi AX3000', 'Redes', 'unidades', [5, 15]);
  agregar('Access Point PoE interior', 'Redes', 'unidades', [4, 12]);
  agregar('Access Point exterior', 'Redes', 'unidades', [3, 8]);
  ['12U', '24U', '42U'].forEach((u) => agregar(`Rack abierto ${u}`, 'Redes', 'unidades', [1, 4]));
  agregar('Patch panel 24 puertos', 'Redes', 'unidades', [3, 10]);
  agregar('Organizador de cables horizontal', 'Redes', 'unidades', [5, 15]);
  agregar('Conector RJ45 (bolsa 100u)', 'Redes', 'bolsas', [10, 30]);
  ['20x12', '40x25', '60x40'].forEach((m) => agregar(`Canaleta PVC ${m}mm (tira 2m)`, 'Redes', 'tiras', [20, 60]));
  agregar('Tester de cable de red', 'Redes', 'unidades', [2, 6]);

  // Eléctrico
  [3, 5, 10, 20].forEach((m) => agregar(`Extensión eléctrica ${m}m`, 'Eléctrico', 'unidades', [5, 20]));
  [4, 6, 8].forEach((t) => agregar(`Multitoma ${t} tomas con protección`, 'Eléctrico', 'unidades', [5, 15]));
  ['650VA', '1000VA', '1500VA'].forEach((va) => agregar(`UPS ${va}`, 'Eléctrico', 'unidades', [2, 6]));
  ['9W', '12W', '15W', '20W'].forEach((w) => agregar(`Ampolleta LED ${w} E27`, 'Eléctrico', 'unidades', [30, 80]));
  ['60cm', '120cm'].forEach((l) => agregar(`Tubo LED ${l}`, 'Eléctrico', 'unidades', [20, 50]));
  ['simple', 'doble', 'triple'].forEach((t) => agregar(`Interruptor ${t}`, 'Eléctrico', 'unidades', [15, 40]));
  ['negra', 'roja', 'azul'].forEach((c) => agregar(`Cinta aisladora ${c}`, 'Eléctrico', 'unidades', [30, 80]));
  agregar('Regulador de voltaje 1000VA', 'Eléctrico', 'unidades', [3, 8]);
  agregar('Cable de poder 3m', 'Eléctrico', 'unidades', [15, 40]);

  // Seguridad (EPP)
  ['S', 'M', 'L', 'XL'].forEach((t) => agregar(`Guantes de seguridad talla ${t}`, 'Seguridad (EPP)', 'pares', [20, 60]));
  ['blanco', 'amarillo', 'azul', 'rojo'].forEach((c) => agregar(`Casco de seguridad ${c}`, 'Seguridad (EPP)', 'unidades', [10, 30]));
  ['M', 'L', 'XL'].forEach((t) => agregar(`Chaleco reflectante talla ${t}`, 'Seguridad (EPP)', 'unidades', [15, 40]));
  [39, 40, 41, 42, 43, 44].forEach((n) => agregar(`Zapatos de seguridad N°${n}`, 'Seguridad (EPP)', 'pares', [5, 15]));
  agregar('Lentes de protección claros', 'Seguridad (EPP)', 'unidades', [20, 50]);
  agregar('Lentes de protección oscuros', 'Seguridad (EPP)', 'unidades', [15, 40]);
  agregar('Mascarilla antipolvo (caja 50u)', 'Seguridad (EPP)', 'cajas', [10, 25]);
  agregar('Mascarilla con filtro P100', 'Seguridad (EPP)', 'unidades', [10, 30]);
  agregar('Arnés de altura 4 argollas', 'Seguridad (EPP)', 'unidades', [3, 8]);
  agregar('Cuerda de vida con absorbedor', 'Seguridad (EPP)', 'unidades', [3, 8]);
  agregar('Protector auditivo tipo copa', 'Seguridad (EPP)', 'unidades', [10, 30]);
  agregar('Tapones auditivos (caja 100 pares)', 'Seguridad (EPP)', 'cajas', [5, 15]);

  // Ferretería
  ['6x1', '8x1,5', '8x2', '10x2', '10x3'].forEach((m) => agregar(`Tornillos ${m}" (caja 100u)`, 'Ferretería', 'cajas', [10, 30]));
  ['1/4', '5/16', '3/8'].forEach((m) => agregar(`Tuercas ${m}" (caja 100u)`, 'Ferretería', 'cajas', [10, 25]));
  ['1/4x2', '5/16x3', '3/8x4'].forEach((m) => agregar(`Pernos ${m}" (caja 50u)`, 'Ferretería', 'cajas', [8, 20]));
  ['3', '5', '8', '10'].forEach((mm) => agregar(`Broca HSS ${mm}mm`, 'Ferretería', 'unidades', [10, 30]));
  ['115', '180', '230'].forEach((mm) => agregar(`Disco de corte ${mm}mm`, 'Ferretería', 'unidades', [15, 40]));
  agregar('Martillo carpintero', 'Ferretería', 'unidades', [3, 10]);
  agregar('Martillo demoledor 5kg', 'Ferretería', 'unidades', [2, 5]);
  ['paleta', 'cruz', 'precisión'].forEach((t) => agregar(`Set destornilladores ${t}`, 'Ferretería', 'sets', [3, 10]));
  ['8-19mm', 'ajustable 8"', 'ajustable 12"', 'allen'].forEach((t) => agregar(`Llave ${t}`, 'Ferretería', 'unidades', [3, 10]));
  agregar('Taladro percutor 650W', 'Ferretería', 'unidades', [2, 6]);
  agregar('Taladro inalámbrico 18V', 'Ferretería', 'unidades', [2, 6]);
  agregar('Sierra manual', 'Ferretería', 'unidades', [3, 8]);
  agregar('Sierra circular 7 1/4"', 'Ferretería', 'unidades', [2, 5]);
  agregar('Cinta métrica 5m', 'Ferretería', 'unidades', [10, 25]);
  agregar('Cinta métrica 8m', 'Ferretería', 'unidades', [5, 15]);
  agregar('Escalera aluminio 6 peldaños', 'Ferretería', 'unidades', [2, 5]);
  agregar('Caja de herramientas metálica', 'Ferretería', 'unidades', [3, 8]);

  // Oficina
  ['carta', 'oficio'].forEach((t) => agregar(`Resma papel ${t} 500 hojas`, 'Oficina', 'resmas', [20, 60]));
  ['carta', 'oficio'].forEach((t) => agregar(`Archivador tamaño ${t}`, 'Oficina', 'unidades', [10, 30]));
  ['azul', 'negro', 'rojo'].forEach((c) => agregar(`Lápiz pasta ${c} (caja 12u)`, 'Oficina', 'cajas', [10, 25]));
  agregar('Notebook básico 14"', 'Oficina', 'unidades', [2, 5]);
  agregar('Notebook profesional 15,6"', 'Oficina', 'unidades', [2, 4]);
  ['22', '24'].forEach((p) => agregar(`Monitor ${p} pulgadas`, 'Oficina', 'unidades', [3, 8]));
  agregar('Teclado y mouse inalámbrico', 'Oficina', 'sets', [5, 12]);
  agregar('Silla ergonómica de oficina', 'Oficina', 'unidades', [2, 6]);
  ['negro', 'cian', 'magenta', 'amarillo'].forEach((c) => agregar(`Tóner ${c} LaserJet`, 'Oficina', 'unidades', [3, 10]));
  agregar('Pizarra blanca 90x60', 'Oficina', 'unidades', [2, 5]);

  // Limpieza
  ['5L', '10L'].forEach((v) => agregar(`Detergente industrial ${v}`, 'Limpieza', 'bidones', [10, 25]));
  ['5L', '10L'].forEach((v) => agregar(`Cloro concentrado ${v}`, 'Limpieza', 'bidones', [10, 25]));
  ['50L', '80L', '120L'].forEach((v) => agregar(`Bolsas de basura ${v} (rollo 10u)`, 'Limpieza', 'rollos', [20, 50]));
  ['S', 'M', 'L'].forEach((t) => agregar(`Guantes de látex talla ${t} (caja 100u)`, 'Limpieza', 'cajas', [10, 25]));
  agregar('Papel higiénico industrial (pack 6 rollos)', 'Limpieza', 'packs', [15, 40]);
  agregar('Toalla de papel (pack 6 rollos)', 'Limpieza', 'packs', [15, 40]);
  agregar('Escoba industrial', 'Limpieza', 'unidades', [5, 15]);
  agregar('Trapero industrial con carro', 'Limpieza', 'unidades', [3, 8]);
  agregar('Alcohol gel 5L', 'Limpieza', 'bidones', [10, 25]);
  agregar('Desinfectante multiuso 5L', 'Limpieza', 'bidones', [10, 25]);

  // Embalaje
  ['pequeña 30x20x15', 'mediana 40x30x30', 'grande 60x40x40', 'extra 80x60x40'].forEach((t) =>
    agregar(`Caja cartón ${t}cm`, 'Embalaje', 'unidades', [30, 100]));
  ['transparente', 'café', 'con logo'].forEach((t) => agregar(`Cinta embalaje ${t} (rollo)`, 'Embalaje', 'rollos', [20, 60]));
  agregar('Film stretch manual (rollo)', 'Embalaje', 'rollos', [15, 40]);
  agregar('Film stretch para máquina (rollo)', 'Embalaje', 'rollos', [10, 25]);
  agregar('Pallet de madera estándar', 'Embalaje', 'unidades', [10, 30]);
  agregar('Pallet plástico', 'Embalaje', 'unidades', [5, 15]);
  ['térmicas 100x150', 'adhesivas 50x25', 'de frágil'].forEach((t) =>
    agregar(`Etiquetas ${t} (rollo 500u)`, 'Embalaje', 'rollos', [10, 30]));
  agregar('Zuncho plástico (rollo)', 'Embalaje', 'rollos', [10, 25]);
  agregar('Hebillas para zuncho (bolsa 100u)', 'Embalaje', 'bolsas', [10, 25]);
  agregar('Bolsas burbuja (rollo 10m)', 'Embalaje', 'rollos', [10, 30]);
  agregar('Esquineros de cartón (pack 50u)', 'Embalaje', 'packs', [10, 25]);

  // Bodega y logística
  agregar('Transpaleta manual 2500kg', 'Bodega', 'unidades', [1, 3]);
  agregar('Carro plataforma 300kg', 'Bodega', 'unidades', [2, 5]);
  ['liviana 3 niveles', 'mediana 4 niveles', 'industrial 5 niveles'].forEach((t) =>
    agregar(`Estantería ${t}`, 'Bodega', 'unidades', [2, 6]));
  ['10L', '30L', '60L'].forEach((v) => agregar(`Contenedor plástico ${v}`, 'Bodega', 'unidades', [10, 30]));
  ['zona de carga', 'extintor', 'salida de emergencia', 'uso obligatorio EPP'].forEach((t) =>
    agregar(`Señalética "${t}"`, 'Bodega', 'unidades', [5, 15]));
  agregar('Candado de seguridad 50mm', 'Bodega', 'unidades', [5, 15]);
  agregar('Lámpara de emergencia LED', 'Bodega', 'unidades', [5, 12]);
  agregar('Espejo convexo de seguridad 60cm', 'Bodega', 'unidades', [2, 5]);
  agregar('Tope de estacionamiento para grúa', 'Bodega', 'unidades', [4, 10]);
  ['5kg polvo químico', '10kg polvo químico', '5kg CO2'].forEach((t) =>
    agregar(`Extintor ${t}`, 'Bodega', 'unidades', [3, 8]));

  // Complementos de oficina y aseo
  agregar('Clips metálicos (caja 100u)', 'Oficina', 'cajas', [10, 30]);
  agregar('Corchetes 26/6 (caja 5000u)', 'Oficina', 'cajas', [10, 25]);
  agregar('Corchetera metálica', 'Oficina', 'unidades', [5, 12]);
  agregar('Carpeta colgante (pack 25u)', 'Oficina', 'packs', [5, 15]);
  agregar('Destacadores surtidos (pack 4u)', 'Oficina', 'packs', [10, 20]);
  agregar('Plumón de pizarra negro', 'Oficina', 'unidades', [10, 30]);
  agregar('Esponja multiuso (pack 6u)', 'Limpieza', 'packs', [10, 30]);
  agregar('Paño microfibra (pack 3u)', 'Limpieza', 'packs', [10, 30]);
  agregar('Limpiavidrios 5L', 'Limpieza', 'bidones', [5, 15]);
  agregar('Dispensador de jabón', 'Limpieza', 'unidades', [3, 10]);
  ['M', 'L', 'XL'].forEach((t) => agregar(`Overol desechable talla ${t}`, 'Seguridad (EPP)', 'unidades', [10, 30]));
  agregar('Jack RJ45 Cat6 keystone', 'Redes', 'unidades', [20, 50]);
  agregar('Placa de pared 2 puertos (faceplate)', 'Redes', 'unidades', [15, 40]);

  return catalogo;
}

async function crearTrabajadores() {
  const passwordHash = await bcrypt.hash(PASSWORD_INICIAL, 10);
  const documentos = [];
  for (const datos of TRABAJADORES) {
    const usuario = await Usuario.findOneAndUpdate(
      { email: datos.email },
      { $setOnInsert: { ...datos, passwordHash } },
      { upsert: true, returnDocument: 'after' }
    );
    documentos.push(usuario);
  }
  return documentos;
}

async function crearProductos(supervisores, proveedores) {
  const catalogo = construirCatalogo();
  let creados = 0;
  const logsAuditoria = [];

  for (const datos of catalogo) {
    const existente = await Producto.findOne({ nombre: datos.nombre });
    if (existente) continue;

    const producto = await Producto.create({
      ...datos,
      proveedorId: elegirAlAzar(proveedores)._id,
      stockActual: 0
    });
    creados++;

    // Trazabilidad: el producto queda registrado como creado por un supervisor
    logsAuditoria.push({
      usuarioId: elegirAlAzar(supervisores)._id,
      accion: `Creó el producto ${producto.nombre}`,
      fechaHora: fechaHistorica(),
      ip: '127.0.0.1'
    });
  }

  // Coherencia del histórico: los productos que ya existían en la base de
  // datos (por seeds anteriores) también deben tener su registro de creación
  // atribuido a un supervisor, si aún no lo tienen.
  const todosLosProductos = await Producto.find().select('nombre');
  const accionesEsperadas = todosLosProductos.map((p) => `Creó el producto ${p.nombre}`);
  const logsExistentes = await Log.find({ accion: { $in: accionesEsperadas } }).select('accion');
  const conLog = new Set(logsExistentes.map((l) => l.accion));
  todosLosProductos.forEach((p) => {
    const accion = `Creó el producto ${p.nombre}`;
    if (!conLog.has(accion) && !logsAuditoria.some((l) => l.accion === accion)) {
      logsAuditoria.push({
        usuarioId: elegirAlAzar(supervisores)._id,
        accion,
        fechaHora: fechaHistorica(),
        ip: '127.0.0.1'
      });
    }
  });

  if (logsAuditoria.length > 0) await Log.insertMany(logsAuditoria, { ordered: false });
  return { totalCatalogo: catalogo.length, creados, logsCreacion: logsAuditoria.length };
}

// Los movimientos existentes que no pertenezcan a un operario (por ejemplo,
// los generados antes a nombre del administrador) pasan a los operarios.
async function reasignarMovimientos(operarios) {
  const idsOperarios = operarios.map((o) => o._id);
  const aReasignar = await Movimiento.find({ usuarioId: { $nin: idsOperarios } }).select('_id');

  const LOTE = 1000;
  for (let i = 0; i < aReasignar.length; i += LOTE) {
    const operaciones = aReasignar.slice(i, i + LOTE).map((mov) => ({
      updateOne: {
        filter: { _id: mov._id },
        update: { $set: { usuarioId: elegirAlAzar(operarios)._id } }
      }
    }));
    await Movimiento.bulkWrite(operaciones);
    process.stdout.write(`\r  Movimientos reasignados: ${Math.min(i + LOTE, aReasignar.length)}/${aReasignar.length}`);
  }
  if (aReasignar.length > 0) console.log('');
  return aReasignar.length;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB');

  const proveedores = await Proveedor.find();
  if (proveedores.length === 0) {
    console.error('No hay proveedores. Ejecuta primero "npm run seed:datos".');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Creando trabajadores...');
  const trabajadores = await crearTrabajadores();
  const supervisores = trabajadores.filter((t) => t.rol === 'supervisor');
  const operarios = trabajadores.filter((t) => t.rol === 'operario');
  console.log(`  ${supervisores.length} supervisores y ${operarios.length} operarios disponibles`);

  console.log('Creando catálogo de productos (ingresados por los supervisores)...');
  const { totalCatalogo, creados, logsCreacion } = await crearProductos(supervisores, proveedores);
  const totalProductos = await Producto.countDocuments();
  console.log(`  Catálogo definido: ${totalCatalogo} | creados ahora: ${creados} | total en BD: ${totalProductos}`);
  console.log(`  Registros de auditoría de creación agregados: ${logsCreacion}`);

  console.log('Reasignando movimientos existentes a los operarios...');
  const reasignados = await reasignarMovimientos(operarios);
  console.log(`  Total reasignados: ${reasignados}`);

  console.log('\nCredenciales iniciales de los trabajadores (cámbialas si lo deseas):');
  TRABAJADORES.forEach((t) => console.log(`  ${t.rol.padEnd(10)} ${t.email.padEnd(35)} ${PASSWORD_INICIAL}`));
  console.log('\nSi después de esto ejecutas "npm run seed:bigdata", los movimientos nuevos ya quedarán a nombre de los operarios.');

  await mongoose.disconnect();
  console.log('\nListo.');
}

module.exports = { construirCatalogo, TRABAJADORES };

if (require.main === module) {
  main().catch((error) => {
    console.error('Error al crear los trabajadores:', error);
    process.exit(1);
  });
}
