$(document).ready(function () {
    let tablaProductos = $('productos-table').DataTable(); // Inicializa DataTables con el #

    // Función para cargar los productos desde el backend
   
    function cargarProductos() {
        fetch('/colaborador/productos/data')
            .then(response => response.json())
            .then(data => {
                const productosBody = document.getElementById('productos-body');
                productosBody.innerHTML = ''; // Limpiar el contenido existente
    
                data.productos.forEach(producto => {
                    const row = document.createElement('tr');
    
                    // Verificar si es un producto alterno o principal
                    if (producto.esAlterno) {
                        row.innerHTML = `
                            <td>${producto.codigo || 'N/A'}</td>
                            <td>${producto.nombre || 'Sin nombre'}</td>
                            <td>${parseFloat(producto.precio).toFixed(2) || '0.00'}</td>
                            <td>${producto.categoria || 'Sin categoría'}</td>
                            <td style="background-color: ${producto.color_hex || 'transparent'}; position: relative;">
                                <span style="color: ${producto.color_hex || '#FFF'}; opacity: 90%; filter: invert(1); mix-blend-mode:add">
                                    ${producto.color || 'Sin color'}
                                </span>
                            </td>
                            <td class="editable-stock" contenteditable="true" 
                                data-codigo="C-${producto.color_id}">
                                ${producto.stock || 0}
                            </td>
                            <td>
                                
                            </td>
                        `;
                    } else {
                        row.innerHTML = `
                            <td>${producto.codigo || 'N/A'}</td>
                            <td>${producto.nombre || 'Sin nombre'}</td>
                            <td>${parseFloat(producto.precio).toFixed(2) || '0.00'}</td>
                            <td>${producto.categoria || 'Sin categoría'}</td>
                            <td style="background-color: ${producto.color_hex || 'transparent'}; position: relative;">
                                <span style="color: ${producto.color_hex || '#FFF'}; opacity: 90%; filter: invert(1); mix-blend-mode:add">
                                    ${producto.color || 'Sin color'}
                                </span>
                            </td>
                            <td class="editable-stock" contenteditable="true" 
                                data-codigo="${producto.codigo}">
                                ${producto.stock || 0}
                            </td>
                            <td>
                                <input type="checkbox" class="destacado-checkbox" 
                                    data-id="${producto.codigo}" 
                                    ${producto.destacado === 1 ? 'checked' : ''}>
                            </td>
                        `;
                    }
    
                    productosBody.appendChild(row);
                });
    
                // Reinicializar DataTables
                if ($.fn.DataTable.isDataTable('#productos-table')) {
                    tablaProductos.destroy();
                }
                tablaProductos = $('#productos-table').DataTable();
            })
            .catch(error => console.error('Error al cargar productos:', error));
    }
    
    // Llamar a la función cargarProductos para obtener los datos al cargar la página
    cargarProductos();

    $('#productos-table tbody').on('click', 'tr', function () {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        } else {
            tablaProductos.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }
    });


    // Evento del checkbox para manejar los destacados
    $(document).on('change', '.destacado-checkbox', function () {
        const checkbox = $(this);
        const codigoProducto = checkbox.data('id');
        const destacado = checkbox.is(':checked') ? 1 : 0;

        // Contar cuántos productos están seleccionados como destacados
        const destacadosSeleccionados = $('.destacado-checkbox:checked').length;

        if (destacadosSeleccionados > 6) {
            alert('Solo puedes seleccionar hasta 6 productos destacados.');
            checkbox.prop('checked', !checkbox.is(':checked')); // Revertir el cambio
            return;
        }

        // Enviar la actualización al servidor
        fetch('/colaborador/productos/actualizar-destacado', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codigo: codigoProducto, destacado }),
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    alert('Error al actualizar el estado de destacado.');
                    checkbox.prop('checked', !checkbox.is(':checked')); // Revertir el cambio en caso de error
                }
            })
            .catch(error => console.error('Error al actualizar destacado:', error));
    });

    


      // Evento del botón "Crear Producto"
      $('#crear-producto').click(function () {
        window.location.href = '/colaborador/productos/crear'; // Redirigir a la página de creación de productos
    });

       // Evento del botón "Modificar Producto"
       $('#modificar-producto').click(function () {
        const productoSeleccionado = tablaProductos.row('.selected').data();

        if (!productoSeleccionado) {
            alert('Por favor selecciona un producto para modificar.');
            return;
        }

        const codigoProducto = productoSeleccionado[0]; // Suponiendo que el código está en la primera columna
        window.location.href = `/colaborador/productos/modificar?codigo=${codigoProducto}`;
    });

    // Evento del botón "Modificar Gráfica"
$('#grafica').click(function () {
    const productoSeleccionado = tablaProductos.row('.selected').data();

    if (!productoSeleccionado) {
        alert('Por favor selecciona un producto para modificar la gráfica.');
        return;
    }

    const productId = productoSeleccionado[0]; // Suponiendo que el ID del producto está en la primera columna
    window.location.href = `/colaborador/grafica?product_id=${productId}`;
});



    // Evento del botón "Eliminar Producto"
// Evento del botón "Eliminar Producto"
    $('#eliminar-producto').click(function () {
        const productoSeleccionado = tablaProductos.row('.selected').data();

        if (!productoSeleccionado) {
            alert('Por favor selecciona un producto');
            return;
        }

        const confirmacion = confirm(`¿Estás seguro de que deseas eliminar el producto: ${productoSeleccionado[1]}?      SE ELIMINARA TODO EL PRODCUTO JUNTO CON LOS COLORS ALTERNOS`);
        if (confirmacion) {
            fetch(`/colaborador/productos/eliminar/${productoSeleccionado[0]}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        // Remover la fila de la tabla sin recargar la página
                        
                        alert('Producto eliminado correctamente');
                        location.reload(); // Recargar toda la página
                    } else {
                        alert('Error al eliminar el producto');
                    }
                })
                .catch(error => console.error('Error al eliminar producto:', error));
        }
    });












    $('#productos-table tbody').on('click', 'td.editable-stock', function () {
        const celda = $(this);
    
        // Evitar múltiples inputs en la misma celda
        if (celda.find('input').length > 0) return;
    
        const valorActual = celda.text().trim();
        celda.html(`<input type="number" class="stock-input" value="${valorActual}" style="width: 100%;" min="0" step="1">`);
    
        const input = celda.find('input');
    
        // Mostrar el botón de guardar cambios
        $('#guardar-cambios').show();
    
        // Guardar cambios al perder el foco
        input.on('blur', function () {
          const nuevoValor = $(this).val().trim();
    
          // Validar que el nuevo valor sea un número válido
          if (nuevoValor === "" || isNaN(nuevoValor) || parseInt(nuevoValor) < 0) {
            alert('Por favor, ingresa un valor numérico válido para el stock.');
            celda.text(valorActual); // Restaurar el valor original
            return;
          }
    
          celda.text(nuevoValor); // Actualizar la celda con el nuevo valor
        });
    
        // Guardar cambios al presionar Enter
        input.on('keypress', function (e) {
          if (e.key === 'Enter') {
            $(this).blur(); // Forzar el evento blur
          }
        });
    
        input.focus(); // Enfocar automáticamente en el input
      });
    
      // Evento para guardar cambios en el stock
      $('#guardar-cambios').click(function () {
        const botonGuardar = $(this);
        botonGuardar.text('Guardando...'); // Cambiar texto del botón
        botonGuardar.prop('disabled', true); // Deshabilitar el botón mientras se guarda
    
        const cambios = [];
        $('.editable-stock').each(function () {
          const celda = $(this);
          const codigoProducto = celda.data('codigo');
          const nombreProducto = celda.closest('tr').find('td:nth-child(2)').text().trim(); // Leer el nombre
          const nuevoStock = celda.text().trim();
    
          if (codigoProducto && nuevoStock !== "") {
            cambios.push({
              codigo: codigoProducto,
              nombre: nombreProducto, // Enviar también el nombre para identificar alternos
              stock: parseInt(nuevoStock, 10)
            });
          }
        });
    
        if (cambios.length === 0) {
          alert('No hay cambios para guardar.');
          botonGuardar.text('Guardar Cambios'); // Restaurar texto del botón
          botonGuardar.prop('disabled', false); // Habilitar el botón
          return;
        }
    
        // Enviar los cambios al backend
        fetch('/colaborador/productos/actualizar-stock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productos: cambios })
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              alert('Stock actualizado con éxito.');
              botonGuardar.hide(); // Ocultar el botón después de guardar
            } else {
              alert(`Error al actualizar el stock: ${data.error}`);
            }
          })
          .catch(error => console.error('Error al actualizar el stock:', error))
          .finally(() => {
            // Restaurar el texto y habilitar el botón después de guardar
            botonGuardar.text('Guardar Cambios');
            botonGuardar.prop('disabled', false);
          });
      });
  

});




