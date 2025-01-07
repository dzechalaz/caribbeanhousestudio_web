document.addEventListener('DOMContentLoaded', function () {
    const compraId = window.location.pathname.split('/').pop();
    const progressBar = document.getElementById('progress-bar');
    const estadoDetalles = document.querySelector('.details');
    const cancelarBtn = document.getElementById('cancelar-btn');
    const guardarFechaBtn = document.getElementById('guardar-fecha-btn');
    const fechaInput = document.getElementById('fecha-input');
    const ultimaFechaSpan = document.getElementById('ultima-fecha');

    let estadoActual;

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
                estadoActual = compra.estado;
                generarBarraProgreso(estadoActual);
                estadoDetalles.innerText = obtenerDescripcionEstado(estadoActual);

                // Mostrar la última fecha estimada (si existe) y cargarla en el input
                if (compra.FechaEstimada) {
                    fechaInput.value = new Date(compra.FechaEstimada).toISOString().split('T')[0];
                    ultimaFechaSpan.textContent = `Última fecha estimada: ${formatFecha(compra.FechaEstimada)}`;
                }
            } else {
                alert(data.error || 'Error al cargar la compra.');
            }
        })
        .catch((error) => console.error('Error al cargar los datos:', error));

    // Función para formatear la fecha a "10/ENE/2025"
    function formatFecha(fecha) {
        const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(fecha).toLocaleDateString('es-ES', opciones).toUpperCase();
    }

    // Guardar fecha estimada
    guardarFechaBtn.addEventListener('click', () => {
        const nuevaFecha = fechaInput.value;

        if (!nuevaFecha) {
            alert('Por favor, ingrese una fecha estimada.');
            return;
        }

        fetch(`/colaborador/compras/modificar-estado/${compraId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ FechaEstimada: nuevaFecha }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    alert('Fecha estimada actualizada correctamente.');
                    window.location.reload();
                } else {
                    alert(data.error || 'Error al actualizar la fecha estimada.');
                }
            })
            .catch((error) => console.error('Error al actualizar la fecha estimada:', error));
    });

    // Generar la barra de progreso dinámica
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

        progressBar.innerHTML = ''; // Limpiar contenido previo

        estados.forEach((estado, index) => {
            const stepIndex = index + 1;
            const step = document.createElement('div');

            let stepClass = '';
            if (stepIndex < estadoActual) {
                stepClass = 'completed';
            } else if (stepIndex === estadoActual) {
                stepClass = 'active';
            }

            step.className = `step ${stepClass}`;
            step.setAttribute('data-step', stepIndex);
            step.innerHTML = `
                <div class="icon">${stepIndex}</div>
                <p>${estado}</p>
            `;

            // Hacer interactiva cada esfera
            step.addEventListener('click', () => {
                actualizarEstado(stepIndex);
            });

            progressBar.appendChild(step);
        });
    }

    // Actualizar el estado de la compra
    function actualizarEstado(nuevoEstado) {
        if (nuevoEstado === estadoActual) {
            alert('El estado seleccionado ya es el actual.');
            return;
        }

        if (confirm(`¿Estás seguro de cambiar al estado "${obtenerDescripcionEstado(nuevoEstado)}"?`)) {
            fetch(`/colaborador/compras/modificar-estado/${compraId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        alert(data.message || 'Estado actualizado correctamente.');
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
        window.location.href = '/colaborador/ordenes';
    });
});
