$(document).ready(function () {
  const ordenId = window.location.pathname.split('/').pop(); // Obtener el ID de la orden de la URL

  let tablaCompras = $('#compras-table').DataTable();

  // Cargar las compras asociadas a la orden
  function cargarCompras() {
    fetch(`/colaborador/ordenes/compras/${ordenId}`)
      .then(response => response.json())
      .then(data => {
        if (data.compras && Array.isArray(data.compras)) {
          tablaCompras.clear();

          data.compras.forEach(compra => {
            // Formatear la fecha en formato DD/MM/YYYY
            const fechaFormateada = new Date(compra.fecha_compra).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });

            // Agregar los datos a la tabla
            tablaCompras.row.add([
              compra.compra_id,
              compra.producto_nombre,
              compra.cantidad,
              fechaFormateada, // Usar fecha formateada aquí
              compra.direccion_envio,
              compra.estado,
              `<button class="modificar-estado-btn btn-rojo-chukum" data-compra-id="${compra.compra_id}">Modificar Estado</button>`
            ]);
          });

          tablaCompras.draw();
        } else {
          console.error('No se encontraron compras para esta orden.');
        }
      })
      .catch(error => console.error('Error al cargar compras:', error));
  }

  cargarCompras();

  // Manejar clics en el botón "Modificar Estado"
  $('#compras-body').on('click', '.modificar-estado-btn', function () {
    const compraId = $(this).data('compra-id');
    if (compraId) {
      window.location.href = `/colaborador/compras/modificar-estado/${compraId}`;
    } else {
      alert('Error: No se encontró el ID de la compra.');
    }
  });
});
