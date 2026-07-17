document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay una sesión activa, se envía directo al panel
  if (obtenerToken() && obtenerUsuario()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('form-login');
  const mensaje = document.getElementById('mensaje');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensaje.classList.add('oculto');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const datos = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      guardarSesion(datos.token, datos.usuario);
      window.location.href = 'dashboard.html';
    } catch (error) {
      mostrarMensaje(mensaje, error.message, 'error');
    }
  });
});
