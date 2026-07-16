// public/js/api.js
// Funciones compartidas por todas las páginas para hablar con la API
// y manejar la sesión (token JWT) guardada en localStorage.

const API_BASE = '/api';

function obtenerToken() {
  return localStorage.getItem('token');
}

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch (error) {
    return null;
  }
}

function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

// Redirige al login si no hay sesión, o al dashboard si el rol no está permitido en la página actual.
function requerirSesion(rolesPermitidos) {
  const usuario = obtenerUsuario();
  if (!obtenerToken() || !usuario) {
    window.location.href = 'index.html';
    return null;
  }
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    window.location.href = 'dashboard.html';
    return null;
  }
  return usuario;
}

// Envoltorio de fetch que agrega el token, arma la URL y maneja errores comunes.
async function apiFetch(ruta, opciones = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opciones.headers || {});
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(API_BASE + ruta, Object.assign({}, opciones, { headers }));

  if (respuesta.status === 401) {
    cerrarSesion();
    throw new Error('Sesión expirada, vuelve a iniciar sesión');
  }

  const contentType = respuesta.headers.get('content-type') || '';
  const datos = contentType.includes('application/json') ? await respuesta.json() : await respuesta.text();

  if (!respuesta.ok) {
    const mensaje = (datos && datos.mensaje) ||
      (datos && datos.errores && datos.errores[0] && datos.errores[0].msg) ||
      'Ocurrió un error al procesar la solicitud';
    throw new Error(mensaje);
  }

  return datos;
}

// Pinta la barra de navegación superior según el rol del usuario autenticado.
function pintarBarraNav(paginaActual) {
  const usuario = obtenerUsuario();
  if (!usuario) return;

  const contenedor = document.getElementById('barra-nav');
  if (!contenedor) return;

  const enlaces = [
    { href: 'dashboard.html', texto: 'Panel', roles: ['operario', 'supervisor', 'administrador'] },
    { href: 'movimientos.html', texto: 'Ingresos / Salidas', roles: ['operario', 'supervisor', 'administrador'] },
    { href: 'productos.html', texto: 'Productos', roles: ['operario', 'supervisor', 'administrador'] },
    { href: 'proveedores.html', texto: 'Proveedores', roles: ['administrador'] },
    { href: 'usuarios.html', texto: 'Usuarios', roles: ['administrador'] }
  ];

  const enlacesHtml = enlaces
    .filter((enlace) => enlace.roles.includes(usuario.rol))
    .map((enlace) => `<a href="${enlace.href}" class="${paginaActual === enlace.href ? 'activo' : ''}">${enlace.texto}</a>`)
    .join('');

  contenedor.innerHTML = `
    <div class="marca">SecureStock</div>
    <nav>${enlacesHtml}</nav>
    <div class="usuario-info">
      <span>${usuario.nombre} (${usuario.rol})</span>
      <button id="btn-cerrar-sesion" type="button">Salir</button>
    </div>
  `;

  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo}`;
  elemento.classList.remove('oculto');
}
