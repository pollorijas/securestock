// public/js/proveedores.js
document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requerirSesion(['administrador']);
  if (!usuario) return;

  pintarBarraNav('proveedores.html');
  document.getElementById('form-proveedor').addEventListener('submit', guardarProveedor);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);

  await cargarProveedores();
});

async function cargarProveedores() {
  const mensaje = document.getElementById('mensaje');
  try {
    const proveedores = await apiFetch('/proveedores');
    pintarTabla(proveedores);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

function pintarTabla(proveedores) {
  const cuerpo = document.getElementById('tabla-proveedores');
  if (proveedores.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5">Sin proveedores registrados</td></tr>';
    return;
  }

  cuerpo.innerHTML = proveedores.map((p) => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.rut}</td>
      <td>${p.telefono}</td>
      <td>${p.direccion}</td>
      <td>
        <button type="button" class="boton secundario btn-editar" data-id="${p._id}">Editar</button>
        <button type="button" class="boton peligro btn-eliminar" data-id="${p._id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-editar').forEach((boton) => {
    boton.addEventListener('click', () => cargarEnFormulario(boton.dataset.id, proveedores));
  });
  document.querySelectorAll('.btn-eliminar').forEach((boton) => {
    boton.addEventListener('click', () => eliminarProveedor(boton.dataset.id));
  });
}

function cargarEnFormulario(id, proveedores) {
  const proveedor = proveedores.find((p) => p._id === id);
  if (!proveedor) return;

  document.getElementById('proveedor-id').value = proveedor._id;
  document.getElementById('nombre').value = proveedor.nombre;
  document.getElementById('rut').value = proveedor.rut;
  document.getElementById('telefono').value = proveedor.telefono;
  document.getElementById('direccion').value = proveedor.direccion;
  document.getElementById('email').value = proveedor.email || '';
  document.getElementById('contacto').value = proveedor.contacto || '';
  document.getElementById('titulo-form').textContent = `Editar: ${proveedor.nombre}`;
  document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
  document.getElementById('form-proveedor').reset();
  document.getElementById('proveedor-id').value = '';
  document.getElementById('titulo-form').textContent = 'Nuevo proveedor';
  document.getElementById('btn-cancelar-edicion').classList.add('oculto');
}

async function guardarProveedor(evento) {
  evento.preventDefault();
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.add('oculto');

  const id = document.getElementById('proveedor-id').value;
  const cuerpo = {
    nombre: document.getElementById('nombre').value.trim(),
    rut: document.getElementById('rut').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    email: document.getElementById('email').value.trim(),
    contacto: document.getElementById('contacto').value.trim()
  };

  try {
    if (id) {
      await apiFetch(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      mostrarMensaje(mensaje, 'Proveedor actualizado correctamente', 'exito');
    } else {
      await apiFetch('/proveedores', { method: 'POST', body: JSON.stringify(cuerpo) });
      mostrarMensaje(mensaje, 'Proveedor creado correctamente', 'exito');
    }
    cancelarEdicion();
    await cargarProveedores();
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

async function eliminarProveedor(id) {
  if (!confirm('¿Eliminar este proveedor? Esta acción no se puede deshacer.')) return;
  const mensaje = document.getElementById('mensaje');

  try {
    await apiFetch(`/proveedores/${id}`, { method: 'DELETE' });
    mostrarMensaje(mensaje, 'Proveedor eliminado correctamente', 'exito');
    await cargarProveedores();
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}
