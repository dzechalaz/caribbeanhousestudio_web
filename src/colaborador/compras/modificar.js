document.addEventListener('DOMContentLoaded', function () {
    const compraId = window.location.pathname.split('/').pop();
    const progressBar = document.getElementById('progress-bar');
    const estadoDetalles = document.querySelector('.details');
    const confirmarBtn = document.getElementById('confirmar-btn');
    const cancelarBtn = document.getElementById('cancelar-btn');
    let estadoActual;

    console.log(`Compra ID: ${compraId}`);

    if (!compraId) {
        alert('No se encontró el ID de la compra.');
        return;
    }

    // Obtener los datos de la compra
    fetch(`/colaborador/compras/data/${compraId}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                const compra = data.compra;
                estadoActual = compra.estado; // Guardar el estado actual para el incremento
                console.log(`Estado actual: ${estadoActual}`);
                generarBarraProgreso(estadoActual);
                estadoDetalles.innerText = obtenerDescripcionEstado(estadoActual);
            } else {
                alert(data.error || 'Error al cargar la compra.');
            }
        })
        .catch((error) => console.error('Error al cargar los datos:', error));

    // Generar la barra de progreso dinámicamente
    function generarBarraProgreso(estadoActual) {
        const estados = [
            'Pedido Confirmado',
            'Insumos Listos',
            'Maquila en Proceso',
            'Barniz',
            'Armado',
            'En Camino',
            'Entrega',
        ];

        if (!progressBar) {
            console.error("El elemento 'progress-bar' no existe en el DOM.");
            return;
        }

        progressBar.innerHTML = ''; // Limpiar el contenido antes de generar dinámicamente

        estados.forEach((estado, index) => {
            const step = document.createElement('div');
            const stepIndex = index + 1;

            // Asignar clases según el estado actual
            let stepClass = '';
            if (stepIndex < estadoActual) {
                stepClass = 'completed';
            } else if (stepIndex === estadoActual) {
                stepClass = 'active';
            }

            step.className = `step ${stepClass}`;
            step.innerHTML = `
                <div class="icon">${stepIndex}</div>
                <p>${estado}</p>
            `;
            progressBar.appendChild(step);
        });
    }

    // Actualizar el estado de la compra
    function actualizarEstado(nuevoEstado) {
        if (nuevoEstado <= estadoActual) {
            alert('No puedes regresar a un estado anterior.');
            return;
        }

        if (confirm(`¿Estás seguro de cambiar al estado "${nuevoEstado}"?`)) {
            console.log(`Actualizando a estado: ${nuevoEstado}`);
            fetch(`/colaborador/compras/modificar-estado/${compraId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        alert(data.message || 'Estado actualizado correctamente.');
                        console.log(`Estado actualizado a: ${nuevoEstado}`);
                        window.location.reload();
                    } else {
                        alert(data.error || 'Error al actualizar el estado.');
                    }
                })
                .catch((error) => console.error('Error al actualizar el estado:', error));
        }
    }

    // Obtener descripción del estado actual
    function obtenerDescripcionEstado(estado) {
        const descripciones = {
            1: 'El pedido ha sido confirmado y está en proceso de preparación.',
            2: 'Los insumos están listos para iniciar el proceso de producción.',
            3: 'El producto está siendo procesado en maquila.',
            4: 'El barniz está siendo aplicado.',
            5: 'El producto está siendo armado.',
            6: 'El producto está en camino al cliente.',
            7: 'El producto ha sido entregado.',
        };
        return descripciones[estado] || 'Estado desconocido.';
    }

 // Evento para cancelar
    cancelarBtn.addEventListener('click', () => {
        window.location.href = '/colaborador/ordenes'; // Redirige a la página de órdenes
    });

    
    // Evento para confirmar el estado
    confirmarBtn.addEventListener('click', () => {
        const nuevoEstado = estadoActual + 1; // Incrementar el estado actual
        actualizarEstado(nuevoEstado);

    });
});
