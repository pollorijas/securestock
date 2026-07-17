document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-resetear');
  const mensaje = document.getElementById('mensaje');
  const parametros = new URLSearchParams(window.location.search);
  const token = parametros.get('token');

  if (!token) {
    mostrarMensaje(mensaje, 'El enlace no incluye un token válido', 'error');
    form.classList.add('oculto');
    return;
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensaje.classList.add('oculto');

    const password = document.getElementById('password').value;

    try {
      const datos = await apiFetch('/auth/resetear', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      mostrarMensaje(mensaje, `${datos.mensaje}. Redirigiendo al inicio de sesión...`, 'exito');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } catch (error) {
      mostrarMensaje(mensaje, error.message, 'error');
    }
  });
});
