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
                        renderEstado(orden.estado), // <-- NUEVO (después de Fecha de Orden)
                        `<button class="ver-orden-btn" data-orden-id="${orden.orden_id}">Ver Orden</button>`,
                        `<button class="eliminar-orden-btn" data-orden-id="${orden.orden_id}">Eliminar</button>`
                        ]);

                  });

                  // Dibujar la tabla con los datos actualizados
                  tablaOrdenes.draw();
              }
          })
          .catch(error => console.error('Error al cargar órdenes:', error));
  }

    // NUEVO: mapa de estado numérico a texto
const ESTADO_TEXTO = {
  0: 'Registrado',
  1: 'Confirmado',
  2: 'Insumos listos',
  3: 'Maquilado',
  4: 'Barniz',
  5: 'Armado',
  6: 'Enviado',
  7: 'Entregado'
};
function renderEstado(n) {
  const txt = ESTADO_TEXTO[n] ?? 'Desconocido';
  return `<span class="pill pill-${n}">${txt}</span>`;
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

  $('#ordenes-table').on('click', '.eliminar-orden-btn', function () {
    const ordenId = $(this).data('orden-id');
    if (!ordenId) {
        alert("Error: No se encontró el ID de la orden.");
        return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar la orden ${ordenId}?`)) {
        fetch(`/api/orden/eliminar/${ordenId}`, { // ✅ Sin dominio, acceso directo a la API
            method: "DELETE",
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Orden ${ordenId} eliminada correctamente.`);
                cargarOrdenes(); // Volver a cargar la tabla después de eliminar
            } else {
                alert("Error al eliminar la orden.");
            }
        })
        .catch(error => console.error("Error al eliminar la orden:", error));
    }
});

});
