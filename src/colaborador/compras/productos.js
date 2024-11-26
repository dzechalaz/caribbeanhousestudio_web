document.addEventListener('DOMContentLoaded', function () {
    fetch('/colaborador/productos/data')
        .then(response => response.json())
        .then(data => {
            const body = document.getElementById('productos-body');
            data.productos.forEach(producto => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="producto-checkbox"></td>
                    <td>${producto.producto_id}</td>
                    <td>${producto.codigo}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.precio}</td>
                    <td>${producto.stock}</td>
                    <td><input type="number" class="cantidad-input" min="1" max="${producto.stock}" value="1" disabled></td>
                `;
                body.appendChild(row);

                const checkbox = row.querySelector('.producto-checkbox');
                const cantidadInput = row.querySelector('.cantidad-input');

                // Habilitar o deshabilitar la cantidad según el estado del checkbox
                checkbox.addEventListener('change', function () {
                    cantidadInput.disabled = !checkbox.checked;
                    if (!checkbox.checked) cantidadInput.value = 1; // Restablecer valor si se deselecciona
                });
            });
        });

    document.getElementById('finalizar-orden').addEventListener('click', function () {
        const productos = [];
        document.querySelectorAll('#productos-body tr').forEach(row => {
            const checkbox = row.querySelector('.producto-checkbox');
            if (checkbox && checkbox.checked) {
                const productoId = row.cells[1].innerText; // Código del producto
                const cantidad = row.querySelector('.cantidad-input').value;
                productos.push({ producto_id: productoId, cantidad: parseInt(cantidad) });
            }
        });

        if (productos.length === 0) {
            alert('Debes seleccionar al menos un producto.');
            return;
        }

        fetch('/colaborador/ordenes/finalizar', {
            method: 'POST',
            body: JSON.stringify({ productos }),
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
});
