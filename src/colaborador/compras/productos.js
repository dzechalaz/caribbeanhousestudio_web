document.addEventListener('DOMContentLoaded', function () {
    let productos = [];
    let paginaActual = 1;
    let productosPorPagina = 10;

    const cargarProductos = (filtro = "") => {
        const inicio = (paginaActual - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;

        const productosFiltrados = filtro
            ? productos.filter(producto =>
                producto.nombre.toLowerCase().includes(filtro.toLowerCase())
            )
            : productos;

        const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
        document.getElementById('total-paginas').innerText = totalPaginas;

        const body = document.getElementById('productos-body');
        body.innerHTML = "";

        productosFiltrados.slice(inicio, fin).forEach(producto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="producto-checkbox"></td>
                <td>${producto.codigo}</td>
                <td>${producto.nombre}</td>
                <td>${parseFloat(producto.precio).toFixed(2)}</td>
                <td>${producto.categoria || 'Sin categoría'}</td>
                <td style="background-color: ${producto.color_hex || 'transparent'};">
                    ${producto.color || 'Principal'}
                </td>
                <td>${producto.stock}</td>
                <td><input type="number" class="cantidad-input" min="1" max="${producto.stock}" value="1" disabled></td>
            `;
            body.appendChild(row);

            const checkbox = row.querySelector('.producto-checkbox');
            const cantidadInput = row.querySelector('.cantidad-input');

            checkbox.addEventListener('change', function () {
                cantidadInput.disabled = !checkbox.checked;
                if (!checkbox.checked) cantidadInput.value = 1;
            });
        });

        document.getElementById('pagina-actual').innerText = paginaActual;
    };

    fetch('/colaborador/productos/data')
        .then(response => response.json())
        .then(data => {
            productos = data.productos;
            cargarProductos();
        });

        document.getElementById('finalizar-orden').addEventListener('click', function () {
            const seleccionados = [];
            document.querySelectorAll('#productos-body tr').forEach(row => {
                const checkbox = row.querySelector('.producto-checkbox');
                if (checkbox && checkbox.checked) {
                    const codigoProducto = row.cells[1].innerText;
                    const cantidad = parseInt(row.querySelector('.cantidad-input').value);
                    // Extraer el color mostrado en la celda (índice 5)
                    const colorSeleccionado = row.cells[5].innerText.trim();
                    seleccionados.push({ codigo: codigoProducto, cantidad, color: colorSeleccionado });
                }
            });
        
            if (seleccionados.length === 0) {
                alert('Debes seleccionar al menos un producto.');
                return;
            }
        
            fetch('/colaborador/ordenes/finalizar', {
                method: 'POST',
                body: JSON.stringify({ productos: seleccionados }),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Orden creada exitosamente.');
                        window.location.href = '/colaborador/ordenes/crear';
                    } else {
                        alert(data.error);
                    }
                })
                .catch(error => console.error('Error:', error));
        });
        
    // Manejo de la barra de búsqueda
    document.getElementById('busqueda').addEventListener('input', function (e) {
        paginaActual = 1;
        cargarProductos(e.target.value);
    });

    // Manejo de la paginación
    document.getElementById('prev-page').addEventListener('click', function () {
        if (paginaActual > 1) {
            paginaActual--;
            cargarProductos();
        }
    });

    document.getElementById('next-page').addEventListener('click', function () {
        const totalPaginas = Math.ceil(productos.length / productosPorPagina);
        if (paginaActual < totalPaginas) {
            paginaActual++;
            cargarProductos();
        }
    });
});
