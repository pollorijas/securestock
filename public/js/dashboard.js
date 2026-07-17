document.addEventListener('DOMContentLoaded', async () => {
  const usuario = requerirSesion();
  if (!usuario) return;

  pintarBarraNav('dashboard.html');

  const mensaje = document.getElementById('mensaje');

  // El operario no tiene acceso a los indicadores (son solo para supervisor y administrador),
  // así que se le muestra un panel simplificado con acceso directo a registrar movimientos.
  if (usuario.rol === 'operario') {
    document.querySelector('.kpis').classList.add('oculto');
    document.querySelectorAll('.tarjeta').forEach((tarjeta) => tarjeta.classList.add('oculto'));
    mostrarMensaje(mensaje, `Bienvenido/a, ${usuario.nombre}. Ve a "Ingresos / Salidas" para registrar movimientos de bodega.`, 'exito');
    return;
  }

  try {
    const datos = await apiFetch('/movimientos/dashboard');
    pintarKpis(datos);
    pintarGraficoMovimientosPorDia(datos.movimientosPorDia);
    pintarGraficoTopProductos(datos.topProductos);
    pintarTablaStockCritico(datos.stockCritico);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
});

function pintarKpis(datos) {
  const hoy = new Date().toISOString().slice(0, 10);
  const movimientoHoy = datos.movimientosPorDia.find((m) => m._id === hoy);
  document.getElementById('kpi-movimientos-hoy').textContent = movimientoHoy ? movimientoHoy.total : 0;
  document.getElementById('kpi-stock-critico').textContent = datos.stockCritico.length;
}

// Gráfico de barras simple
function pintarBarras(contenedor, items, obtenerValor, obtenerEtiqueta) {
  contenedor.innerHTML = '';
  if (items.length === 0) {
    contenedor.innerHTML = '<p>Sin datos disponibles</p>';
    return;
  }
  const maximo = Math.max(...items.map(obtenerValor), 1);

  items.forEach((item) => {
    const valor = obtenerValor(item);
    const columna = document.createElement('div');
    columna.className = 'barra-columna';
    columna.innerHTML = `
      <div class="barra" style="height:${(valor / maximo) * 100}%" title="${valor}"></div>
      <div class="etiqueta">${obtenerEtiqueta(item)}<br>(${valor})</div>
    `;
    contenedor.appendChild(columna);
  });
}

function pintarGraficoMovimientosPorDia(movimientosPorDia) {
  pintarBarras(
    document.getElementById('grafico-movimientos'),
    movimientosPorDia,
    (item) => item.total,
    (item) => item._id.slice(5)
  );
}

function pintarGraficoTopProductos(topProductos) {
  pintarBarras(
    document.getElementById('grafico-top-productos'),
    topProductos,
    (item) => item.totalMovido,
    (item) => item.nombre
  );
}

function pintarTablaStockCritico(stockCritico) {
  const cuerpo = document.getElementById('tabla-stock-critico');
  if (stockCritico.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4">No hay productos con stock crítico</td></tr>';
    return;
  }
  cuerpo.innerHTML = stockCritico.map((p) => `
    <tr class="stock-bajo">
      <td>${p.nombre}</td>
      <td>${p.stockActual}</td>
      <td>${p.stockMinimo}</td>
      <td>${p.unidad}</td>
    </tr>
  `).join('');
}
