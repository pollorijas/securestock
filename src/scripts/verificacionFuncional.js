// src/scripts/verificacionFuncional.js
// Verificación funcional y de integración con la base de datos (ME Semana 5).
// Recorre los endpoints críticos del sistema y comprueba que respondan lo
// esperado. Es de solo lectura: no crea, modifica ni elimina datos (la única
// escritura que intenta es una salida con stock imposible, que el sistema
// debe RECHAZAR, y el log del login de prueba).
//
// Uso (local):      node src/scripts/verificacionFuncional.js
// Uso (producción): BASE_URL=https://tu-app.onrender.com node src/scripts/verificacionFuncional.js
//
// Credenciales: usa ADMIN_EMAIL y ADMIN_PASSWORD del archivo .env
// (las mismas del script de seed) o defínelas al ejecutar.
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

let aprobadas = 0;
let fallidas = 0;

function resultado(nombre, ok, detalle) {
  if (ok) {
    aprobadas++;
    console.log(`  ✔ ${nombre}`);
  } else {
    fallidas++;
    console.log(`  ✘ ${nombre} -> ${detalle}`);
  }
}

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(BASE_URL + ruta, {
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    method: opciones.method || 'GET',
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });
  let datos = null;
  const tipo = respuesta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) datos = await respuesta.json();
  else datos = await respuesta.text();
  return { status: respuesta.status, datos, tipo };
}

async function main() {
  console.log(`\nVerificación funcional de SecureStock contra: ${BASE_URL}\n`);

  if (!EMAIL || !PASSWORD) {
    console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD en el .env (o como variables de entorno) para ejecutar la verificación.');
    process.exit(1);
  }

  // --- 1. Disponibilidad del servidor ---
  console.log('1. Disponibilidad');
  try {
    const r = await pedir('/api/test');
    resultado('El servidor responde en /api/test', r.status === 200, `status ${r.status}`);
  } catch (error) {
    resultado('El servidor responde en /api/test', false, error.message);
    console.log('\nEl servidor no está accesible. Verifica la URL o que esté encendido.');
    process.exit(1);
  }

  // --- 2. Seguridad: rutas protegidas y credenciales inválidas ---
  console.log('2. Seguridad');
  let r = await pedir('/api/productos');
  resultado('Ruta protegida sin token responde 401', r.status === 401, `status ${r.status}`);

  r = await pedir('/api/auth/login', { method: 'POST', body: { email: 'noexiste@x.cl', password: 'incorrecta' } });
  resultado('Login con credenciales inválidas responde 401', r.status === 401, `status ${r.status}`);

  r = await pedir('/api/auth/login', { method: 'POST', body: {} });
  resultado('Login sin datos responde 400 (validación)', r.status === 400, `status ${r.status}`);

  // --- 3. Autenticación real (integración con la base de datos) ---
  console.log('3. Autenticación');
  r = await pedir('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  const token = r.datos && r.datos.token;
  resultado('Login del administrador entrega token JWT', r.status === 200 && !!token, `status ${r.status}`);

  if (!token) {
    console.log('\nSin token no se pueden verificar los endpoints protegidos. Revisa ADMIN_EMAIL/ADMIN_PASSWORD.');
    resumen();
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${token}` };

  // --- 4. Lecturas principales (verificación de integración con la BD) ---
  console.log('4. Consultas a la base de datos');
  r = await pedir('/api/productos', { headers: auth });
  resultado(`Listado de productos (${Array.isArray(r.datos) ? r.datos.length : 0} encontrados)`, r.status === 200 && Array.isArray(r.datos) && r.datos.length > 0, `status ${r.status}`);
  const productos = Array.isArray(r.datos) ? r.datos : [];

  r = await pedir('/api/proveedores', { headers: auth });
  resultado(`Listado de proveedores (${Array.isArray(r.datos) ? r.datos.length : 0} encontrados)`, r.status === 200 && Array.isArray(r.datos) && r.datos.length > 0, `status ${r.status}`);

  r = await pedir('/api/movimientos/inventario', { headers: auth });
  resultado('Inventario actual responde correctamente', r.status === 200 && Array.isArray(r.datos), `status ${r.status}`);

  r = await pedir('/api/movimientos', { headers: auth });
  resultado(`Historial de movimientos (${Array.isArray(r.datos) ? r.datos.length : 0} encontrados)`, r.status === 200 && Array.isArray(r.datos), `status ${r.status}`);

  r = await pedir('/api/movimientos/dashboard', { headers: auth });
  resultado('Indicadores del dashboard responden', r.status === 200 && r.datos && Array.isArray(r.datos.movimientosPorDia), `status ${r.status}`);

  r = await pedir('/api/logs', { headers: auth });
  resultado(`Logs de auditoría (${Array.isArray(r.datos) ? r.datos.length : 0} registros)`, r.status === 200 && Array.isArray(r.datos), `status ${r.status}`);

  r = await pedir('/api/movimientos/export?formato=csv', { headers: auth });
  resultado('Exportación CSV responde con archivo', r.status === 200 && r.tipo.includes('text/csv'), `status ${r.status}, tipo ${r.tipo}`);

  // --- 5. Regla de negocio: el sistema debe RECHAZAR una salida imposible ---
  console.log('5. Reglas de negocio');
  if (productos.length > 0) {
    r = await pedir('/api/movimientos/salida', {
      method: 'POST',
      headers: auth,
      body: { destino: 'Verificación', items: [{ productoId: productos[0]._id, cantidad: 99999999 }] }
    });
    resultado('Salida con stock insuficiente es rechazada (400)', r.status === 400, `status ${r.status}`);
  } else {
    resultado('Salida con stock insuficiente es rechazada (400)', false, 'no hay productos para probar');
  }

  resumen();
  process.exit(fallidas > 0 ? 1 : 0);
}

function resumen() {
  console.log(`\nResumen: ${aprobadas} aprobadas, ${fallidas} fallidas.`);
  console.log(fallidas === 0
    ? 'El sistema está listo. ✔\n'
    : 'Hay verificaciones fallidas: revisa los puntos marcados con ✘ antes de la demostración.\n');
}

main().catch((error) => {
  console.error('Error inesperado durante la verificación:', error.message);
  process.exit(1);
});
