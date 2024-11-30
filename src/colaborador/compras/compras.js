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
                      const chartData = visitas.map(visita => {
                        const date = new Date(visita.fecha);
                        return {
                          time: `${date.getFullYear()}-${(date.getMonth() + 1)
                            .toString()
                            .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
                          value: visita.cantidad,
                        };
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
