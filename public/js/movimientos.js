let productosDisponibles = [];

document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requerirSesion(['operario', 'supervisor', 'administrador']);
  if (!usuario) return;

  pintarBarraNav('movimientos.html');

  const mensajeForm = document.getElementById('mensaje-form');

  // El supervisor no registra movimientos, solo consulta el historial.
  if (usuario.rol === 'supervisor') {
    document.getElementById('form-movimiento').closest('.tarjeta').classList.add('oculto');
  } else {
    await cargarDatosFormulario();
    document.getElementById('btn-agregar-item').addEventListener('click', () => agregarItem());
    agregarItem();
    document.getElementById('tipo').addEventListener('change', actualizarCamposPorTipo);
    document.getElementById('form-movimiento').addEventListener('submit', guardarMovimiento);
    actualizarCamposPorTipo();
  }

  // El operario ve solo su propio historial; supervisor y administrador ven todo
  // y además pueden exportarlo.
  document.getElementById('tarjeta-historial').classList.remove('oculto');
  document.getElementById('btn-filtrar').addEventListener('click', cargarHistorial);
  if (usuario.rol === 'operario') {
    document.getElementById('btn-exportar').classList.add('oculto');
  } else {
    document.getElementById('btn-exportar').addEventListener('click', exportarCsv);
  }
  await cargarHistorial();
});

async function cargarDatosFormulario() {
  try {
    const [productos, proveedores] = await Promise.all([
      apiFetch('/productos/basico'),
      apiFetch('/proveedores')
    ]);
    productosDisponibles = productos;

    const selectProveedor = document.getElementById('proveedorId');
    selectProveedor.innerHTML = proveedores.map((p) => `<option value="${p._id}">${p.nombre}</option>`).join('');
  } catch (error) {
    mostrarMensaje(document.getElementById('mensaje-form'), error.message, 'error');
  }
}

function actualizarCamposPorTipo() {
  const esIngreso = document.getElementById('tipo').value === 'ingreso';
  document.getElementById('campo-proveedor').classList.toggle('oculto', !esIngreso);
  document.getElementById('campo-lote').classList.toggle('oculto', !esIngreso);
  document.getElementById('campo-factura').classList.toggle('oculto', !esIngreso);
  document.getElementById('campo-destino').classList.toggle('oculto', esIngreso);
}

function agregarItem() {
  const plantilla = document.getElementById('plantilla-item');
  const nodo = plantilla.content.cloneNode(true);
  const select = nodo.querySelector('.item-producto');
  select.innerHTML = productosDisponibles.map((p) => `<option value="${p._id}">${p.nombre} (${p.unidad})</option>`).join('');
  nodo.querySelector('.btn-quitar-item').addEventListener('click', (evento) => {
    evento.target.closest('.item-movimiento').remove();
  });
  document.getElementById('lista-items').appendChild(nodo);
}

async function guardarMovimiento(evento) {
  evento.preventDefault();
  const mensaje = document.getElementById('mensaje-form');
  mensaje.classList.add('oculto');

  const tipo = document.getElementById('tipo').value;
  const items = Array.from(document.querySelectorAll('.item-movimiento')).map((fila) => ({
    productoId: fila.querySelector('.item-producto').value,
    cantidad: Number(fila.querySelector('.item-cantidad').value),
    precioUnitario: fila.querySelector('.item-precio').value ? Number(fila.querySelector('.item-precio').value) : undefined
  }));

  if (items.length === 0) {
    mostrarMensaje(mensaje, 'Agrega al menos un producto', 'error');
    return;
  }

  const cuerpo = tipo === 'ingreso'
    ? {
        proveedorId: document.getElementById('proveedorId').value,
        lote: document.getElementById('lote').value,
        factura: document.getElementById('factura').value,
        observaciones: document.getElementById('observaciones').value,
        items
      }
    : {
        destino: document.getElementById('destino').value,
        observaciones: document.getElementById('observaciones').value,
        items
      };

  try {
    await apiFetch(`/movimientos/${tipo}`, { method: 'POST', body: JSON.stringify(cuerpo) });
    mostrarMensaje(mensaje, 'Movimiento registrado correctamente', 'exito');
    document.getElementById('form-movimiento').reset();
    document.getElementById('lista-items').innerHTML = '';
    agregarItem();
    actualizarCamposPorTipo();
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

function construirQueryFiltros() {
  const parametros = new URLSearchParams();
  const tipo = document.getElementById('filtro-tipo').value;
  const desde = document.getElementById('filtro-desde').value;
  const hasta = document.getElementById('filtro-hasta').value;
  if (tipo) parametros.set('tipo', tipo);
  if (desde) parametros.set('fechaInicio', desde);
  if (hasta) parametros.set('fechaFin', hasta);
  return parametros.toString();
}

async function cargarHistorial() {
  const mensaje = document.getElementById('mensaje-historial');
  mensaje.classList.add('oculto');
  try {
    const query = construirQueryFiltros();
    const movimientos = await apiFetch(`/movimientos${query ? '?' + query : ''}`);
    pintarHistorial(movimientos);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

function pintarHistorial(movimientos) {
  const cuerpo = document.getElementById('tabla-historial');
  if (movimientos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4">Sin movimientos para el filtro seleccionado</td></tr>';
    return;
  }

  cuerpo.innerHTML = movimientos.map((m) => {
    const detalle = m.detalles.map((det) => `${det.productoId ? det.productoId.nombre : 'Producto eliminado'} x${det.cantidad}`).join(', ');
    return `
      <tr>
        <td>${new Date(m.fechaHora).toLocaleString()}</td>
        <td>${m.tipo}</td>
        <td>${m.usuarioId ? m.usuarioId.nombre : ''}</td>
        <td>${detalle}</td>
      </tr>
    `;
  }).join('');
}

async function exportarCsv() {
  try {
    const query = construirQueryFiltros();
    const respuesta = await fetch(`/api/movimientos/export?formato=csv${query ? '&' + query : ''}`, {
      headers: { Authorization: `Bearer ${obtenerToken()}` }
    });
    const blob = await respuesta.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'movimientos.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    mostrarMensaje(document.getElementById('mensaje-historial'), 'No se pudo exportar el archivo', 'error');
  }
}
