document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const codigoProducto = urlParams.get('codigo');

  if (!codigoProducto) {
    alert('No se especificó el código del producto.');
    window.location.href = '/colaborador/productos/stock';
    return;
  }

  const form = document.getElementById('modificar-producto-form');
  const guardarBtn = document.querySelector('#guardar-producto'); // Selector del botón guardar
  const loadingMessage = document.createElement('p');
  loadingMessage.innerText = 'Cargando datos del producto...';
  document.querySelector('.container').appendChild(loadingMessage);

  const coloresAlternosContainer = document.getElementById('colores-alternos-container');
  const coloresAlternosTable = document.getElementById('colores-alternos-table').querySelector('tbody');
  const agregarColorBtn = document.getElementById('agregar-color');
  const container = document.querySelector('.container');

  // Cargar datos del producto seleccionado
  fetch(`/colaborador/productos/data/${codigoProducto}`)
    .then(response => response.json())
    .then(data => {
      loadingMessage.remove();

      if (data.success) {
        const producto = data.producto;
        const coloresAlternos = data.coloresAlternos || [];

        // Precargar los campos del formulario
        document.getElementById('nombre').value = producto.nombre || '';
        document.getElementById('precio').value = producto.precio || '';
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('codigo').value = producto.codigo || '';
        document.getElementById('stock').value = producto.stock || '';
        document.getElementById('material').value = producto.material || '';
        document.getElementById('dimensiones').value = producto.dimensiones || '';
        document.getElementById('acabado').value = producto.acabado || '';
        document.getElementById('color').value = producto.color_principal || '';
        document.getElementById('hex').value = producto.color_hex_principal || '#FFFFFF';
        document.getElementById('descripcion1').value = producto.descripcion1 || '';
        document.getElementById('descripcion2').value = producto.descripcion2 || '';

        // Habilitar y cargar colores alternos si existen
        if (coloresAlternos.length > 0) {
          document.getElementById('habilitar-colores-alternos').checked = true;
          coloresAlternosContainer.style.display = 'block';

          // Ajustar el diseño del contenedor si hay colores alternos
          container.style.maxWidth = '900px';
          document.body.style.marginTop = '500px';

          coloresAlternos.forEach(color => {
            agregarFilaColorAlterno(color);
          });
        } else {
          // Ajustar el diseño del contenedor si no hay colores alternos
          container.style.maxWidth = '400px';
          document.body.style.marginTop = '320px';
        }
      } else {
        alert('Error al cargar los datos del producto.');
        window.location.href = '/colaborador/productos/stock';
      }
    })
    .catch(error => {
      loadingMessage.remove();
      console.error('Error al cargar el producto:', error);
      alert('Ocurrió un error al cargar los datos del producto.');
      window.location.href = '/colaborador/productos/stock';
    });

  // Función para agregar una fila de color alterno
  function agregarFilaColorAlterno(color = {}) {
    const fila = document.createElement('tr');
    fila.dataset.colorId = color.color_id || ''; // Vincula el color_id si existe

    fila.innerHTML = `
      <td><input type="text" name="color_alterno[]" value="${color.color || ''}" placeholder="Nombre del color"></td>
      <td><input type="color" name="hex_alterno[]" value="${color.color_hex || '#FFFFFF'}" style="width: 50px; height: 50px;"></td>
      <td><input type="number" name="stock_alterno[]" value="${color.stock || 0}" placeholder="Stock"></td>
      <td>
        <label>Imagen A: <input type="file" name="imagen_color_a[]" ></label><br>
        <label>Imagen B: <input type="file" name="imagen_color_b[]" ></label><br>
        <label>Imagen C: <input type="file" name="imagen_color_c[]" ></label><br>
        <label>Imagen D: <input type="file" name="imagen_color_d[]" ></label>

      </td>
      <td><button type="button" class="eliminar-fila">Eliminar</button></td>
       
    `;

    fila.querySelector('.eliminar-fila').addEventListener('click', function () {
      const colorId = fila.dataset.colorId;

      if (confirm('¿Estás seguro de que deseas eliminar este color alterno?')) {
        fetch(`/colaborador/colores-alternos/eliminar/${colorId}`, {
          method: 'DELETE',
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              alert(data.message);
              fila.remove();
            } else {
              alert(`Error: ${data.error}`);
            }
          })
          .catch(error => {
            console.error('Error al eliminar el color alterno:', error);
            alert('Ocurrió un error al eliminar el color alterno.');
          });
      }
    });

    coloresAlternosTable.appendChild(fila);
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    guardarBtn.disabled = true;
    guardarBtn.textContent = 'Guardando...';
  
    const formData = new FormData(form);
  
    // Recolectar colores alternos válidos
    const filasColores = coloresAlternosTable.querySelectorAll('tr');
    filasColores.forEach(fila => {
      const colorInput = fila.querySelector('[name="color_alterno[]"]');
      const hexInput = fila.querySelector('[name="hex_alterno[]"]');
      const stockInput = fila.querySelector('[name="stock_alterno[]"]');
  
      const color = colorInput ? colorInput.value.trim() : '';
      const hex = hexInput ? hexInput.value.trim() : '';
      const stock = stockInput ? stockInput.value.trim() || '0' : '0';
  
      // Validar si la fila tiene datos válidos
      if (color && hex) {
        formData.append('color_id[]', fila.dataset.colorId || '');
        formData.append('color_alterno[]', color);
        formData.append('hex_alterno[]', hex);
        formData.append('stock_alterno[]', stock);
  
        // Subir imágenes de colores alternos
        ['a', 'b', 'c', 'd'].forEach(letra => {
          const imagenInput = fila.querySelector(`[name="imagen_color_${letra}[]"]`);
          if (imagenInput && imagenInput.files.length > 0) {
            formData.append(`imagen_color_${letra}[]`, imagenInput.files[0]);
          }
        });
      }
    });
  
    fetch(`/colaborador/productos/modificar/${codigoProducto}`, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Producto modificado con éxito.');
          window.location.href = '/colaborador/productos/stock';
        } else {
          alert(`Error: ${data.error}`);
          guardarBtn.disabled = false;
          guardarBtn.textContent = 'Guardar Cambios';
        }
      })
      .catch(error => {
        console.error('Error al modificar el producto:', error);
        alert('Ocurrió un error al modificar el producto. Intenta nuevamente.');
        guardarBtn.disabled = false;
        guardarBtn.textContent = 'Guardar Cambios';
      });
  });
  

  // Botón para agregar colores alternos
  agregarColorBtn.addEventListener('click', function () {
    agregarFilaColorAlterno();
  });

  // Mostrar/ocultar sección de colores alternos
  document.getElementById('habilitar-colores-alternos').addEventListener('change', function (event) {
    if (event.target.checked) {
      coloresAlternosContainer.style.display = 'block';
      coloresAlternosTable.innerHTML = ''; // No agregar filas predeterminadas
    } else {
      coloresAlternosContainer.style.display = 'none';
      coloresAlternosTable.innerHTML = ''; // Limpiar colores alternos
    }
  });

  // Botón cancelar
  document.getElementById('cancelar-btn').addEventListener('click', function () {
    window.location.href = '/colaborador/productos/stock';
  });
});
