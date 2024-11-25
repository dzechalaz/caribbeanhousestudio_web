$(document).ready(function () {
    // Inicializar DataTable
    const tablaOrdenes = $('#ordenes-table').DataTable();
  
    // Función para cargar las órdenes desde el backend
    function cargarOrdenes() {
      fetch('/colaborador/ordenes/data')
        .then(response => response.json())
        .then(data => {
          if (data.ordenes && Array.isArray(data.ordenes)) {
            // Limpiar la tabla antes de agregar nuevos datos
            tablaOrdenes.clear();
  
            // Agregar filas dinámicamente
            data.ordenes.forEach(orden => {
              const fechaFormateada = new Date(orden.fecha_orden).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
  
              tablaOrdenes.row.add([
                orden.numero_orden,
                orden.cliente_nombre,
                orden.referencia,
                fechaFormateada,
                `<button class="ver-orden-btn" data-orden-id="${orden.orden_id}">Ver Orden</button>`,
              ]);
            });
  
            // Dibujar la tabla con los datos actualizados
            tablaOrdenes.draw();
          }
        })
        .catch(error => console.error('Error al cargar órdenes:', error));
    }
  
    // Cargar las órdenes al cargar la página
    cargarOrdenes();
  
    // Delegación de eventos para manejar el clic en "Ver Orden"
    $('#ordenes-table').on('click', '.ver-orden-btn', function () {
      const ordenId = $(this).data('orden-id');
      if (ordenId) {
        // Redirigir a la página de compras asociada a la orden
        window.location.href = `/colaborador/compras/${ordenId}`;
      } else {
        alert('Error: No se encontró el ID de la orden.');
      }
    });
  });
  