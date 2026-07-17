require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Proveedor = require('../models/Proveedores');
const Producto = require('../models/Productos');
const Movimiento = require('../models/Movimientos');
const MovimientoDet = require('../models/MovimientoDet');

const MAX_PRODUCTOS = 100;
const DIAS_HISTORICO = 45; // los movimientos se reparten en los últimos 45 días

function aleatorioEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegirAlAzar(lista) {
  return lista[aleatorioEntre(0, lista.length - 1)];
}

function fechaAleatoriaReciente() {
  const diasAtras = aleatorioEntre(0, DIAS_HISTORICO);
  const horas = aleatorioEntre(7, 19); // dentro del horario laboral (RNF03)
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(horas, aleatorioEntre(0, 59), 0, 0);
  return fecha;
}

// --- Datos de proveedores ficticios (mínimo 10 exigidos, se crean 12) ---
const PROVEEDORES = [
  { nombre: 'Distribuidora Andina Ltda.', rut: '76.111.222-3', direccion: 'Av. Industrial 4520, Santiago', telefono: '+56 9 1111 2222', email: 'contacto@andina.cl', contacto: 'Pedro Ramírez' },
  { nombre: 'ImportTech SpA', rut: '77.222.333-4', direccion: 'Camino La Frontera 1200, Quilicura', telefono: '+56 9 2222 3333', email: 'ventas@importtech.cl', contacto: 'Carla Muñoz' },
  { nombre: 'Suministros del Sur S.A.', rut: '78.333.444-5', direccion: 'Ruta 5 Sur km 12, Rancagua', telefono: '+56 9 3333 4444', email: 'contacto@sumsur.cl', contacto: 'Jorge Alarcón' },
  { nombre: 'Comercial Norte Ltda.', rut: '79.444.555-6', direccion: 'Av. Circunvalación 890, Antofagasta', telefono: '+56 9 4444 5555', email: 'ventas@comnorte.cl', contacto: 'Fernanda Rojas' },
  { nombre: 'Equipos y Herramientas SpA', rut: '76.555.666-7', direccion: 'Los Industriales 300, Maipú', telefono: '+56 9 5555 6666', email: 'contacto@eyh.cl', contacto: 'Marcelo Soto' },
  { nombre: 'Insumos Pacífico Ltda.', rut: '77.666.777-8', direccion: 'Av. Portales 2200, Valparaíso', telefono: '+56 9 6666 7777', email: 'ventas@pacifico.cl', contacto: 'Daniela Vera' },
  { nombre: 'TecnoBodega SpA', rut: '78.777.888-9', direccion: 'Panamericana Norte 5600, Quillota', telefono: '+56 9 7777 8888', email: 'contacto@tecnobodega.cl', contacto: 'Ignacio Paredes' },
  { nombre: 'Seguridad Industrial Ltda.', rut: '79.888.999-K', direccion: 'Av. Vicuña Mackenna 6200, Santiago', telefono: '+56 9 8888 9999', email: 'ventas@segindustrial.cl', contacto: 'Valentina Castro' },
  { nombre: 'Ferretería Mayorista Ltda.', rut: '76.999.111-2', direccion: 'Camino a Melipilla 900, Santiago', telefono: '+56 9 9999 1111', email: 'contacto@ferremayorista.cl', contacto: 'Rodrigo Fuentes' },
  { nombre: 'Embalajes del Pacífico S.A.', rut: '77.111.222-3', direccion: 'Av. Colón 1500, Concepción', telefono: '+56 9 1122 3344', email: 'ventas@embalpacifico.cl', contacto: 'Camila Torres' },
  { nombre: 'Oficinas y Equipos SpA', rut: '78.222.333-4', direccion: 'Av. Apoquindo 4400, Las Condes', telefono: '+56 9 2233 4455', email: 'contacto@oficequipos.cl', contacto: 'Sebastián Herrera' },
  { nombre: 'Limpieza Total Ltda.', rut: '79.333.444-5', direccion: 'Av. Departamental 1800, La Florida', telefono: '+56 9 3344 5566', email: 'ventas@limpiezatotal.cl', contacto: 'Paula Jiménez' }
];

// --- Catálogo de productos ficticios por categoría (unidad + rango de stock mínimo) ---
const CATALOGO = {
  'Redes': {
    unidad: 'unidades',
    stockMinimo: [10, 30],
    items: [
      'Cable UTP Cat6 (caja 305m)', 'Router Wifi AC1200', 'Switch 24 puertos', 'Switch 8 puertos',
      'Patch panel 24 puertos', 'Access Point PoE', 'Conector RJ45 (bolsa 100u)', 'Canaleta PVC 20x12mm',
      'Rack abierto 12U', 'Organizador de cables', 'Módulo SFP', 'Antena exterior direccional',
      'Convertidor de medios', 'Tester de cable de red'
    ]
  },
  'Electrónica': {
    unidad: 'unidades',
    stockMinimo: [5, 20],
    items: [
      'Multitoma industrial 6 tomas', 'Regulador de voltaje 1000VA', 'Batería UPS 1500VA',
      'Cable de poder 3m', 'Adaptador HDMI a VGA', 'Ventilador industrial de piso',
      'Extensión eléctrica 20m', 'Cargador USB-C 65W', 'Disco duro externo 1TB'
    ]
  },
  'Oficina': {
    unidad: 'unidades',
    stockMinimo: [10, 40],
    items: [
      'Resma papel carta 500 hojas', 'Archivador tamaño oficio', 'Notebook básico 14"',
      'Monitor 24 pulgadas', 'Teclado y mouse inalámbrico', 'Silla ergonómica de oficina',
      'Pizarra blanca 90x60', 'Calculadora científica', 'Perforadora de escritorio'
    ]
  },
  'Seguridad (EPP)': {
    unidad: 'pares',
    stockMinimo: [20, 60],
    items: [
      'Guantes de seguridad', 'Casco de seguridad', 'Chaleco reflectante', 'Lentes de protección',
      'Zapatos de seguridad', 'Arnés de altura', 'Protector auditivo', 'Mascarilla antipolvo (caja 50u)',
      'Careta facial de protección'
    ]
  },
  'Ferretería': {
    unidad: 'unidades',
    stockMinimo: [5, 25],
    items: [
      'Taladro percutor', 'Set de destornilladores (12 piezas)', 'Cinta métrica 5m',
      'Candado de seguridad', 'Escalera de aluminio 6 peldaños', 'Llave de tuercas ajustable',
      'Sierra manual', 'Set de brocas', 'Caja de herramientas metálica'
    ]
  },
  'Limpieza': {
    unidad: 'litros',
    stockMinimo: [15, 40],
    items: [
      'Detergente industrial 5L', 'Escoba industrial', 'Guantes de látex (caja 100u)',
      'Desinfectante multiuso 5L', 'Trapero industrial', 'Bolsas de basura (rollo 50u)',
      'Alcohol gel 5L'
    ]
  },
  'Embalaje': {
    unidad: 'unidades',
    stockMinimo: [20, 80],
    items: [
      'Caja de cartón reforzada', 'Cinta de embalaje (rollo)', 'Film stretch industrial',
      'Pallet de madera', 'Bolsas burbuja (rollo 10m)', 'Etiquetas adhesivas (rollo 500u)',
      'Zuncho plástico (rollo)'
    ]
  }
};

const DESTINOS = ['Tienda Norte', 'Tienda Sur', 'Tienda Centro', 'Sucursal Valparaíso', 'Bodega Externa', 'Cliente Mayorista'];

async function crearProveedores() {
  const documentos = [];
  for (const datos of PROVEEDORES) {
    const proveedor = await Proveedor.findOneAndUpdate(
      { nombre: datos.nombre },
      { $setOnInsert: datos },
      { upsert: true, returnDocument: 'after' }
    );
    documentos.push(proveedor);
  }
  return documentos;
}

async function crearProductos(proveedores) {
  // Se arma la lista completa de productos posibles y se recorta a MAX_PRODUCTOS
  const candidatos = [];
  for (const [categoria, datos] of Object.entries(CATALOGO)) {
    for (const nombre of datos.items) {
      candidatos.push({ nombre, categoria, unidad: datos.unidad, stockMinimo: aleatorioEntre(...datos.stockMinimo) });
    }
  }
  const seleccionados = candidatos.slice(0, MAX_PRODUCTOS);

  const documentos = [];
  for (const datos of seleccionados) {
    const proveedor = elegirAlAzar(proveedores);
    const producto = await Producto.findOneAndUpdate(
      { nombre: datos.nombre },
      { $setOnInsert: { ...datos, proveedorId: proveedor._id, stockActual: 0 } },
      { upsert: true, returnDocument: 'after' }
    );
    documentos.push(producto);
  }
  return documentos;
}

async function crearMovimientos(productos, proveedores, usuarios) {
  let totalIngresos = 0;
  let totalSalidas = 0;

  for (const producto of productos) {
    let stockSimulado = 0;

    // 1 a 3 ingresos por producto, para dejar stock disponible
    const cantidadIngresos = aleatorioEntre(1, 3);
    for (let i = 0; i < cantidadIngresos; i++) {
      const cantidad = aleatorioEntre(20, 200);
      const proveedor = elegirAlAzar(proveedores);
      const usuario = elegirAlAzar(usuarios);

      const movimiento = await Movimiento.create({
        tipo: 'ingreso',
        proveedorId: proveedor._id,
        fechaHora: fechaAleatoriaReciente(),
        usuarioId: usuario._id,
        observaciones: 'Ingreso de datos de prueba (seedDatosFicticios)'
      });
      await MovimientoDet.create({ movimientoId: movimiento._id, productoId: producto._id, cantidad });
      await Producto.findByIdAndUpdate(producto._id, { $inc: { stockActual: cantidad } });

      stockSimulado += cantidad;
      totalIngresos++;
    }

    // 0 a 2 salidas, sin dejar el stock en negativo
    const cantidadSalidas = aleatorioEntre(0, 2);
    for (let i = 0; i < cantidadSalidas && stockSimulado > 0; i++) {
      const cantidad = aleatorioEntre(1, Math.min(stockSimulado, 30));
      const usuario = elegirAlAzar(usuarios);

      const movimiento = await Movimiento.create({
        tipo: 'salida',
        destino: elegirAlAzar(DESTINOS),
        fechaHora: fechaAleatoriaReciente(),
        usuarioId: usuario._id,
        observaciones: 'Salida de datos de prueba (seedDatosFicticios)'
      });
      await MovimientoDet.create({ movimientoId: movimiento._id, productoId: producto._id, cantidad });
      await Producto.findByIdAndUpdate(producto._id, { $inc: { stockActual: -cantidad } });

      stockSimulado -= cantidad;
      totalSalidas++;
    }
  }

  return { totalIngresos, totalSalidas };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB');

  const usuarios = await Usuario.find({ rol: { $in: ['operario', 'administrador'] } });
  if (usuarios.length === 0) {
    console.error('No hay usuarios operario/administrador en la base de datos. Crea al menos uno antes de ejecutar este script (por ejemplo con "npm run seed").');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Creando proveedores...');
  const proveedores = await crearProveedores();
  console.log(`Proveedores disponibles: ${proveedores.length}`);

  console.log('Creando productos...');
  const productos = await crearProductos(proveedores);
  console.log(`Productos disponibles: ${productos.length}`);

  console.log('Creando ingresos y salidas...');
  const { totalIngresos, totalSalidas } = await crearMovimientos(productos, proveedores, usuarios);
  console.log(`Ingresos creados: ${totalIngresos} | Salidas creadas: ${totalSalidas}`);

  console.log('Listo.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Error al generar los datos ficticios:', error);
  process.exit(1);
});
