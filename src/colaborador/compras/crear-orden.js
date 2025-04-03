document.addEventListener('DOMContentLoaded', () => {
  let currentUserId = null; // Para guardar el usuario_id si existe
  
  const form = document.getElementById('form-datos');
  const correoInput = document.getElementById('correo');
  const verificarCorreoBtn = document.getElementById('verificar-correo');
  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  const referenciaInput = document.getElementById('referencia');
  const direccionSelect = document.getElementById('direccion-select');
  const sinDireccionesMsg = document.getElementById('sin-direcciones');
  const agregarDireccionBtn = document.getElementById('agregar-direccion');
  
  // Botón para registrar nuevo cliente (ya no dispara submit, gracias a type="button")
  const registrarClienteBtn = document.getElementById('registrar-cliente');
  
  // Modal para agregar dirección
  const addressModal = document.getElementById('address-modal');
  const closeModalBtn = addressModal.querySelector('.close');
  const addAddressForm = document.getElementById('add-address-form');
  
  // Diccionario de tarifas de envío
  const tarifasEnvio = {
    "Playa del Carmen": 500,
    "Puerto Morelos": 900,
    "Puerto Aventuras": 900,
    "Cancún": 1250,
    "Tulum": 1250
  };
  
  // Deshabilitar edición de nombre y teléfono por defecto
  nombreInput.readOnly = true;
  telefonoInput.readOnly = true;
  
  // =======================
  // 1) Verificar correo
  // =======================
  verificarCorreoBtn.addEventListener('click', () => {
    const correo = correoInput.value.trim();
    if (!correo) {
      alert('Por favor, ingresa un correo electrónico.');
      return;
    }
    fetch('/colaborador/ordenes/verificar-correo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          if (data.registrado) {
            // Cliente existente: guardar userId y cargar datos
            currentUserId = data.usuario_id;
            nombreInput.value = data.datos.nombre;
            telefonoInput.value = data.datos.telefono;
            nombreInput.readOnly = true;
            telefonoInput.readOnly = true;
  
            alert('El correo ya está registrado. Datos y direcciones cargados.');
            registrarClienteBtn.style.display = 'none';
  
            // Limpiar y cargar direcciones
            direccionSelect.innerHTML = '<option value="">Selecciona una dirección existente</option>';
            if (data.direcciones && data.direcciones.length > 0) {
              data.direcciones.forEach(dir => {
                const option = document.createElement('option');
                option.value = dir.direccion_id;
                option.textContent = `${dir.nombre_direccion}: ${dir.calle}, ${dir.colonia}, ${dir.ciudad} (${dir.cp})`;
                direccionSelect.appendChild(option);
              });
              sinDireccionesMsg.style.display = 'none';
            } else {
              sinDireccionesMsg.style.display = 'block';
            }
          } else {
            // Cliente no registrado: habilitar edición y mostrar botón de registro
            currentUserId = null;
            nombreInput.value = '';
            telefonoInput.value = '';
            nombreInput.readOnly = false;
            telefonoInput.readOnly = false;
            direccionSelect.innerHTML = '<option value="">No hay direcciones registradas</option>';
            sinDireccionesMsg.style.display = 'block';
            alert('El correo no está registrado. Ingresa los datos del cliente y registra una dirección.');
            registrarClienteBtn.style.display = 'inline-block';
          }
        } else {
          alert(data.error || 'Error al verificar el correo.');
        }
      })
      .catch(error => {
        console.error('Error al verificar el correo:', error);
        alert('Hubo un error al verificar el correo. Por favor, intenta nuevamente.');
      });
  });
  
  // =======================
  // 2) Registrar Nuevo Cliente
  // =======================
  registrarClienteBtn.addEventListener('click', () => {
    // Solo se toman los campos esenciales para crear el usuario
    const correo = correoInput.value.trim();
    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
  
    if (!correo) {
      alert('Por favor, ingresa un correo.');
      return;
    }
    if (!nombre || !telefono) {
      alert('Por favor, ingresa el nombre y teléfono del cliente.');
      return;
    }
  
    fetch('/colaborador/ordenes/registrar-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, nombre, telefono })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Cliente registrado correctamente. Por favor, verifica nuevamente.');
          registrarClienteBtn.style.display = 'none';
          // Forzar verificación para recargar info y direcciones
          verificarCorreoBtn.click();
        } else {
          alert(data.message || 'Error al registrar el cliente.');
        }
      })
      .catch(err => console.error('Error al registrar el cliente:', err));
  });
  
  // =======================
  // 3) Manejo del Modal de Dirección
  // =======================
  agregarDireccionBtn.addEventListener('click', () => {
    if (!currentUserId) {
      alert('Primero verifica el correo de un cliente existente.');
      return;
    }
    addressModal.style.display = 'flex';
  });
  
  closeModalBtn.addEventListener('click', () => {
    addressModal.style.display = 'none';
  });
  
  window.addEventListener('click', (event) => {
    if (event.target === addressModal) {
      addressModal.style.display = 'none';
    }
  });
  
  // Actualizar texto de flete según la ciudad seleccionada en el modal
  const ciudadModal = document.getElementById('ciudad_modal');
  const costoEnvioP = document.getElementById('costo-envio');
  
  ciudadModal.addEventListener('change', () => {
    const ciudadSeleccionada = ciudadModal.value;
    const flete = tarifasEnvio[ciudadSeleccionada] || 0;
    if (ciudadSeleccionada) {
      costoEnvioP.textContent = `Costo de envío: $${flete} MXN`;
    } else {
      costoEnvioP.textContent = "Selecciona una ciudad";
    }
  });
  
  // =======================
  // 4) Guardar nueva dirección en BD
  // =======================
  addAddressForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentUserId) {
      alert('No se puede crear dirección sin un usuario existente.');
      return;
    }
    const ciudadSeleccionada = ciudadModal.value;
    const flete = tarifasEnvio[ciudadSeleccionada] || 0;
  
    const formData = {
      usuario_id: currentUserId,
      nombre_direccion: document.getElementById('nombre_direccion').value,
      calle: document.getElementById('calle_modal').value,
      colonia: document.getElementById('colonia').value,
      ciudad: ciudadSeleccionada,
      estado: document.getElementById('estado_modal').value,
      cp: document.getElementById('cp_modal').value,
      flete: flete
    };
  
    fetch('/colaborador/ordenes/agregar-direccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(response => response.json())
      .then(resp => {
        if (resp.success) {
          alert('Dirección agregada correctamente');
          addressModal.style.display = 'none';
          recargarDireccionesUsuario(currentUserId);
        } else {
          alert(resp.message || 'Error al agregar la dirección.');
        }
      })
      .catch(error => {
        console.error('Error al agregar dirección:', error);
        alert('Error al agregar dirección.');
      });
  });
  
  // Función para recargar direcciones (utilizando el endpoint de verificar correo)
  function recargarDireccionesUsuario(userId) {
    const correo = correoInput.value.trim();
    if (!correo) return;
  
    fetch('/colaborador/ordenes/verificar-correo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.registrado) {
          direccionSelect.innerHTML = '<option value="">Selecciona una dirección existente</option>';
          if (data.direcciones && data.direcciones.length > 0) {
            data.direcciones.forEach(dir => {
              const option = document.createElement('option');
              option.value = dir.direccion_id;
              option.textContent = `${dir.nombre_direccion}: ${dir.calle}, ${dir.colonia}, ${dir.ciudad} (${dir.cp})`;
              direccionSelect.appendChild(option);
            });
            sinDireccionesMsg.style.display = 'none';
          } else {
            sinDireccionesMsg.style.display = 'block';
          }
        }
      })
      .catch(err => console.error('Error al recargar direcciones:', err));
  }
  
  // =======================
  // 5) Enviar formulario principal y guardar datos en sesión
  // =======================
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const direccionSeleccionada = direccionSelect.value;
    const data = {
      correo: correoInput.value.trim(),
      nombre: nombreInput.value.trim(),
      telefono: telefonoInput.value.trim(),
      referencia: referenciaInput.value.trim(),
      // Se envía la dirección como objeto con direccion_id
      direccion: { direccion_id: direccionSeleccionada }
    };
  
    if (!data.correo || !data.nombre || !data.telefono || !data.referencia || !data.direccion.direccion_id) {
      alert('Por favor, completa todos los campos y selecciona una dirección.');
      return;
    }
  
    fetch('/colaborador/ordenes/direccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(respData => {
        if (respData.success) {
          alert(respData.message);
          window.location.href = '/colaborador/ordenes/productos';
        } else {
          alert(respData.error || 'Error al guardar los datos.');
        }
      })
      .catch(error => {
        console.error('Error al guardar los datos:', error);
        alert('Hubo un error al guardar los datos. Por favor, intenta nuevamente.');
      });
  });
});
