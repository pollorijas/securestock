document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requerirSesion(['supervisor', 'administrador']);
  if (!usuario) return;

  pintarBarraNav('productos.html');

  const esAdmin = usuario.rol === 'administrador';
  if (esAdmin) {
    document.getElementById('tarjeta-form').classList.remove('oculto');
    document.getElementById('th-acciones').classList.remove('oculto');
    document.getElementById('form-producto').addEventListener('submit', guardarProducto);
    document.getElementById('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);
  }

  await cargarProductos(esAdmin);
});

async function cargarProductos(esAdmin) {
  const mensaje = document.getElementById('mensaje');
  try {
    const productos = await apiFetch('/productos');
    pintarTabla(productos, esAdmin);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

function pintarTabla(productos, esAdmin) {
  const cuerpo = document.getElementById('tabla-productos');
  if (productos.length === 0) {
    cuerpo.innerHTML = `<tr><td colspan="${esAdmin ? 6 : 5}">Sin productos registrados</td></tr>`;
    return;
  }

  cuerpo.innerHTML = productos.map((p) => `
    <tr class="${p.stockActual <= p.stockMinimo ? 'stock-bajo' : ''}">
      <td>${p.nombre}</td>
      <td>${p.categoria || '-'}</td>
      <td>${p.stockActual}</td>
      <td>${p.stockMinimo}</td>
      <td>${p.unidad}</td>
      ${esAdmin ? `
        <td>
          <button type="button" class="boton secundario btn-editar" data-id="${p._id}">Editar</button>
          <button type="button" class="boton peligro btn-eliminar" data-id="${p._id}">Eliminar</button>
        </td>
      ` : ''}
    </tr>
  `).join('');

  if (esAdmin) {
    document.querySelectorAll('.btn-editar').forEach((boton) => {
      boton.addEventListener('click', () => cargarProductoEnFormulario(boton.dataset.id, productos));
    });
    document.querySelectorAll('.btn-eliminar').forEach((boton) => {
      boton.addEventListener('click', () => eliminarProducto(boton.dataset.id));
    });
  }
}

function cargarProductoEnFormulario(id, productos) {
  const producto = productos.find((p) => p._id === id);
  if (!producto) return;

  document.getElementById('producto-id').value = producto._id;
  document.getElementById('nombre').value = producto.nombre;
  document.getElementById('unidad').value = producto.unidad;
  document.getElementById('stockMinimo').value = producto.stockMinimo;
  document.getElementById('categoria').value = producto.categoria || '';
  document.getElementById('titulo-form').textContent = `Editar: ${producto.nombre}`;
  document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
  document.getElementById('form-producto').reset();
  document.getElementById('producto-id').value = '';
  document.getElementById('titulo-form').textContent = 'Nuevo producto';
  document.getElementById('btn-cancelar-edicion').classList.add('oculto');
}

async function guardarProducto(evento) {
  evento.preventDefault();
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.add('oculto');

  const id = document.getElementById('producto-id').value;
  const cuerpo = {
    nombre: document.getElementById('nombre').value.trim(),
    unidad: document.getElementById('unidad').value.trim(),
    stockMinimo: Number(document.getElementById('stockMinimo').value),
    categoria: document.getElementById('categoria').value.trim()
  };

  try {
    if (id) {
      await apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      mostrarMensaje(mensaje, 'Producto actualizado correctamente', 'exito');
    } else {
      await apiFetch('/productos', { method: 'POST', body: JSON.stringify(cuerpo) });
      mostrarMensaje(mensaje, 'Producto creado correctamente', 'exito');
    }
    cancelarEdicion();
    await cargarProductos(true);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  const mensaje = document.getElementById('mensaje');

  try {
    await apiFetch(`/productos/${id}`, { method: 'DELETE' });
    mostrarMensaje(mensaje, 'Producto eliminado correctamente', 'exito');
    await cargarProductos(true);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}
