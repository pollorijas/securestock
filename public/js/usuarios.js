// public/js/usuarios.js
document.addEventListener('DOMContentLoaded', () => {
  const usuario = requerirSesion(['administrador']);
  if (!usuario) return;

  pintarBarraNav('usuarios.html');
  document.getElementById('form-usuario').addEventListener('submit', crearUsuario);
});

async function crearUsuario(evento) {
  evento.preventDefault();
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.add('oculto');

  const cuerpo = {
    nombre: document.getElementById('nombre').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    rol: document.getElementById('rol').value
  };

  try {
    const datos = await apiFetch('/auth/registro', { method: 'POST', body: JSON.stringify(cuerpo) });
    mostrarMensaje(mensaje, `Usuario "${datos.usuario.nombre}" creado con rol ${datos.usuario.rol}`, 'exito');
    document.getElementById('form-usuario').reset();
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}
