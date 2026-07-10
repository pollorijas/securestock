// public/js/recuperar.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-recuperar');
  const mensaje = document.getElementById('mensaje');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensaje.classList.add('oculto');

    const email = document.getElementById('email').value.trim();

    try {
      const datos = await apiFetch('/auth/recuperar', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      mostrarMensaje(mensaje, datos.mensaje, 'exito');
      form.reset();
    } catch (error) {
      mostrarMensaje(mensaje, error.message, 'error');
    }
  });
});
