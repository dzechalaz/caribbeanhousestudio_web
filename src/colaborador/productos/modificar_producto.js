document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const codigoProducto = urlParams.get('codigo');

  // Cargar datos del producto seleccionado
  fetch(`/colaborador/productos/data/${codigoProducto}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const producto = data.producto;
        // Insertar los valores obtenidos en los campos del formulario
        document.getElementById('nombre').value = producto.nombre || '';
        document.getElementById('precio').value = producto.precio || '';
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('codigo').value = producto.codigo || '';
        document.getElementById('stock').value = producto.stock || '';
     
      } else {
        alert('Error al cargar los datos del producto');
      }
    })
    .catch(error => console.error('Error al cargar el producto:', error));

  // Enviar el formulario de modificación
  document.getElementById('modificar-producto-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(this);

    fetch(`/colaborador/productos/modificar/${codigoProducto}`, {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Producto modificado con éxito');
        window.location.href = '/colaborador/productos/stock';
      } else {
        alert(`Error: ${data.error}`);
      }
    })
    .catch(error => console.error('Error al modificar el producto:', error));
  });

  // Lógica del botón de cancelar para redirigir a la página de stock
  document.getElementById('cancelar-btn').addEventListener('click', function () {
    window.location.href = '/colaborador/productos/stock';
  });
});
