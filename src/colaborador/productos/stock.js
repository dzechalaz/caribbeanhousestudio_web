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
                            data-codigo="${producto.color_alterno ? `C-${producto.color_id}` : producto.codigo}">
                            ${producto.stock || 0}
                        </td>

                        <td>
                            <input type="checkbox" class="destacado-checkbox" 
                                data-id="${producto.codigo}" 
                                ${producto.destacado === 1 ? 'checked' : ''}>
                        </td>
                    `;

                    productosBody.appendChild(row);
                });

                // Reinicializar DataTables
                tablaProductos.destroy();
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














    
// Evento para editar la celda de stock
    // Evento para editar la celda de stock
    $('#productos-table tbody').on('click', 'td.editable-stock', function () {
        const celda = $(this);

        // Evitar múltiples inputs en la misma celda
        if (celda.find('input').length > 0) return;

        const valorActual = celda.text().trim();
        celda.html(`<input type="number" class="stock-input" value="${valorActual}" style="width: 100%;" min="0" step="1">`);

        const input = celda.find('input');

        // Enviar el cambio cuando el input pierda el foco (blur)
        input.on('blur', function () {
            const nuevoValor = $(this).val().trim();

            // Validar que el nuevo valor sea un número válido
            if (nuevoValor === "" || isNaN(nuevoValor) || parseInt(nuevoValor) < 0) {
                alert('Por favor, ingresa un valor numérico válido para el stock.');
                celda.text(valorActual); // Restaurar el valor original
                return;
            }

            celda.text(nuevoValor); // Actualizar la celda con el nuevo valor
            const codigoProducto = celda.data('codigo'); // Identificar si es un color alterno o principal

            // Enviar el cambio al backend
            fetch('/colaborador/productos/actualizar-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productos: [{ codigo: codigoProducto, stock: parseInt(nuevoValor, 10) }] })
            })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert('Error al actualizar el stock en el servidor.');
                        celda.text(valorActual); // Restaurar valor si hubo error en el backend
                    }
                })
                .catch(error => {
                    console.error('Error al actualizar el stock:', error);
                    celda.text(valorActual); // Restaurar valor en caso de error
                });
        });

        // Enviar el cambio al presionar Enter
        input.on('keypress', function (e) {
            if (e.key === 'Enter') {
                $(this).blur(); // Forzar el evento blur
            }
        });

        input.focus(); // Enfocar automáticamente en el input
    });

    // Evento para guardar cambios en el stock
    $(document).on('input', '.editable-stock', function () {
        $('#guardar-cambios').show();
    });

    
$('#guardar-cambios').click(function () {
    const cambios = [];
    $('.editable-stock').each(function () {
        const codigoProducto = $(this).data('codigo');
        const tipoProducto = $(this).data('tipo');
        const nuevoStock = $(this).text().trim();

        if (codigoProducto && nuevoStock !== "") {
            cambios.push({
                codigo: codigoProducto,
                stock: parseInt(nuevoStock, 10),
                tipo: tipoProducto // Añadir el tipo del producto
            });
        }
    });

    if (cambios.length === 0) {
        alert('No hay cambios para guardar.');
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
                $('#guardar-cambios').hide(); // Ocultar el botón después de guardar
                location.reload();
            } else {
                alert(`Error al actualizar el stock: ${data.error}`);
            }
        })
        .catch(error => console.error('Error al actualizar el stock:', error));
});

});




