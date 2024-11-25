document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const codigoProducto = urlParams.get('codigo');

  if (!codigoProducto) {
    alert('No se especificó el código del producto.');
    window.location.href = '/colaborador/productos/stock';
    return;
  }

  const form = document.getElementById('modificar-producto-form');
  const loadingMessage = document.createElement('p');
  loadingMessage.innerText = 'Cargando datos del producto...';
  document.querySelector('.container').appendChild(loadingMessage);

  // Cargar datos del producto seleccionado
  fetch(`/colaborador/productos/data/${codigoProducto}`)
    .then(response => response.json())
    .then(data => {
      loadingMessage.remove();

      if (data.success) {
        const producto = data.producto;

        // Precargar los campos del formulario
        document.getElementById('nombre').value = producto.nombre || '';
        document.getElementById('precio').value = producto.precio || '';
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('codigo').value = producto.codigo || '';
        document.getElementById('stock').value = producto.stock || '';
        document.getElementById('material').value = producto.material || '';
        document.getElementById('dimensiones').value = producto.dimensiones || '';
        document.getElementById('acabado').value = producto.acabado || '';
        document.getElementById('color').value = producto.color || '';
        document.getElementById('descripcion1').value = producto.descripcion1 || '';
        document.getElementById('descripcion2').value = producto.descripcion2 || '';
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

  // Enviar el formulario de modificación
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(form);

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
        }
      })
      .catch(error => {
        console.error('Error al modificar el producto:', error);
        alert('Ocurrió un error al modificar el producto. Intenta nuevamente.');
      });
  });

  // Botón cancelar
  document.getElementById('cancelar-btn').addEventListener('click', function () {
    window.location.href = '/colaborador/productos/stock';
  });
});
