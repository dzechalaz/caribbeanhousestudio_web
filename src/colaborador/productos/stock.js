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
                        <td>${producto.stock}</td>
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
                        alert('Producto eliminado correctamente');
                        cargarProductos(); // Recargar la tabla
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
