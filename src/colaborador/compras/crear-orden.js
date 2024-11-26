document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-datos');
    const correoInput = document.getElementById('correo');
    const verificarCorreoBtn = document.getElementById('verificar-correo');
    const nombreInput = document.getElementById('nombre');
    const telefonoInput = document.getElementById('telefono');
    const referenciaInput = document.getElementById('referencia');
    const calleInput = document.getElementById('calle');
    const ciudadInput = document.getElementById('ciudad');
    const estadoInput = document.getElementById('estado');
    const codigoPostalInput = document.getElementById('codigoPostal');
    const siguienteBtn = document.getElementById('btn-siguiente');

    // Deshabilitar campos por defecto
    nombreInput.readOnly = true;
    telefonoInput.readOnly = true;

    verificarCorreoBtn.addEventListener('click', () => {
        const correo = correoInput.value.trim();

        if (!correo) {
            alert('Por favor, ingresa un correo electrónico.');
            return;
        }

        // Llamada al backend para verificar si el correo existe
        fetch('/colaborador/ordenes/verificar-correo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    if (data.registrado) {
                        // Si la cuenta ya existe, cargar los datos
                        nombreInput.value = data.datos.nombre;
                        telefonoInput.value = data.datos.telefono;

                        // Deshabilitar edición (en caso de estar activada)
                        nombreInput.readOnly = true;
                        telefonoInput.readOnly = true;

                        alert('El correo ya está registrado. Los datos del cliente han sido cargados.');
                    } else {
                        // Habilitar los campos para ingresar nuevos datos
                        nombreInput.value = '';
                        telefonoInput.value = '';
                        nombreInput.readOnly = false;
                        telefonoInput.readOnly = false;

                        alert('El correo no está registrado. Por favor, ingresa los datos del cliente.');
                    }
                } else {
                    alert(data.error || 'Error al verificar el correo.');
                }
            })
            .catch((error) => {
                console.error('Error al verificar el correo:', error);
                alert('Hubo un error al verificar el correo. Por favor, intenta nuevamente.');
            });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const direccion = {
            calle: calleInput.value.trim(),
            ciudad: ciudadInput.value.trim(),
            estado: estadoInput.value.trim(),
            codigoPostal: codigoPostalInput.value.trim(),
        };

        const data = {
            correo: correoInput.value.trim(),
            nombre: nombreInput.value.trim(),
            telefono: telefonoInput.value.trim(),
            referencia: referenciaInput.value.trim(),
            direccion,
        };

        // Validar campos obligatorios antes de enviar
        if (!data.correo || !data.nombre || !data.telefono || !data.referencia || !direccion.calle || !direccion.ciudad || !direccion.estado || !direccion.codigoPostal) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        // Enviar datos al backend
        fetch('/colaborador/ordenes/direccion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    alert(data.message);
                    window.location.href = '/colaborador/ordenes/productos';
                } else {
                    alert(data.error || 'Error al guardar los datos.');
                }
            })
            .catch((error) => {
                console.error('Error al guardar los datos:', error);
                alert('Hubo un error al guardar los datos. Por favor, intenta nuevamente.');
            });
    });
});
