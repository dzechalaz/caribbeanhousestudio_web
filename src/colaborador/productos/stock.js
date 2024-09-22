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
                    row.innerHTML = `
                        
                        <td>${producto.codigo}</td>
                        <td>${producto.nombre}</td>
                        <td>${producto.precio}</td>
                        <td>${producto.categoria}</td>
                        <td contenteditable="true" class="editable-stock" data-codigo="${producto.codigo}">${producto.stock}</td>
                    `;
                    productosBody.appendChild(row);
                });

                // Reinicializar DataTables
                tablaProductos.clear().destroy(); 
                tablaProductos = $('#productos-table').DataTable(); // Reinicializar DataTables correctamente
            })
            .catch(error => console.error('Error al cargar productos:', error));
    }

    // Llamar a la función cargarProductos para obtener los datos al cargar la página
    cargarProductos();

      // Evento del botón "Crear Producto"
      $('#crear-producto').click(function () {
        window.location.href = '/colaborador/productos/crear'; // Redirigir a la página de creación de productos
    });

       // Evento del botón "Modificar Producto"
   $('#modificar-producto').click(function () {
    const productoSeleccionado = tablaProductos.row('.selected').data();

    if (!productoSeleccionado) {
        alert('Por favor selecciona un producto para modificar');
        return;
    }

    // Redirigir a la página de modificación con el código del producto
    const codigoProducto = productoSeleccionado[0]; // Suponiendo que el código está en la primera columna
    window.location.href = `/colaborador/productos/modificar?codigo=${codigoProducto}`;
    });


    // Evento del botón "Eliminar Producto"
// Evento del botón "Eliminar Producto"
    $('#eliminar-producto').click(function () {
        const productoSeleccionado = tablaProductos.row('.selected').data();

        if (!productoSeleccionado) {
            alert('Por favor selecciona un producto');
            return;
        }

        const confirmacion = confirm(`¿Estás seguro de que deseas eliminar el producto: ${productoSeleccionado[1]}?`);
        if (confirmacion) {
            fetch(`/colaborador/productos/eliminar/${productoSeleccionado[0]}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        // Remover la fila de la tabla sin recargar la página
                        tablaProductos.row('.selected').remove().draw(false); // Eliminar fila seleccionada
                        alert('Producto eliminado correctamente');
                    } else {
                        alert('Error al eliminar el producto');
                    }
                })
                .catch(error => console.error('Error al eliminar producto:', error));
        }
    });


    // Seleccionar fila en la tabla (marcarla como seleccionada)
    $('#productos-table tbody').on('click', 'tr', function () {
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        } else {
            tablaProductos.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }
    });
});


$(document).on('input', '.editable-stock', function () {
    // Mostrar el botón de guardar cambios
    $('#guardar-cambios').show();
});

// Evento del botón "Guardar Cambios"
$('#guardar-cambios').click(function () {
    // Recolectar todos los cambios en la columna de stock
    let cambios = [];
    $('.editable-stock').each(function () {
        const nuevoStock = $(this).text().trim();
        const codigoProducto = $(this).data('codigo');
        cambios.push({ codigo: codigoProducto, stock: nuevoStock });
    });

    // Enviar los cambios al servidor
    fetch('/colaborador/productos/actualizar-stock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productos: cambios }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Stock actualizado con éxito');
            $('#guardar-cambios').hide(); // Ocultar el botón después de guardar
        } else {
            alert('Error al actualizar el stock');
        }
    })
    .catch(error => console.error('Error al actualizar el stock:', error));
});
