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
              const fechaFormateada = new Date(compra.fecha_compra).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
  
              tablaCompras.row.add([
                compra.compra_id,
                compra.producto_nombre,
                compra.cantidad,
                compra.fecha_compra,
                compra.direccion_envio,
                compra.estado,
                `<button class="modificar-estado-btn" data-compra-id="${compra.compra_id}">Modificar Estado</button>`
              ]);
            });
  
            tablaCompras.draw();
          }
        })
        .catch(error => console.error('Error al cargar compras:', error));
    }
  
    cargarCompras();
  });
  
  $('#compras-body').on('click', '.modificar-estado-btn', function () {
    const compraId = $(this).data('compra-id');
    if (compraId) {
      window.location.href = `/colaborador/compras/modificar-estado/${compraId}`;
    } else {
      alert('Error: No se encontró el ID de la compra.');
    }
  });
  