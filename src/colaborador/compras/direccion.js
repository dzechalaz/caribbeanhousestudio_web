document.getElementById('direccion-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);

    fetch('/colaborador/ordenes/direccion', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/colaborador/ordenes/productos';
        } else {
            alert(data.error);
        }
    })
    .catch(error => console.error('Error:', error));
});
