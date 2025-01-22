document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('registrosTable').querySelector('tbody');
    const saveChangesButton = document.getElementById('saveChanges');
    const addRowButton = document.getElementById('addRow');
    const chartCanvas = document.getElementById('registrosChart');
    let registros = [];
    let chartInstance;
  
    // Obtener el product_id de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');
  
    if (!productId) {
      alert('No se especificó un producto.');
      return;
    }
  
    const fetchRegistros = async () => {
      try {
        const response = await fetch(`/api/registros/${productId}`);
        const data = await response.json();
        registros = data.registros || [];
        renderTable();
        renderChart();
      } catch (error) {
        console.error('Error al cargar los registros:', error);
      }
    };
  
    const renderTable = () => {
      tableBody.innerHTML = '';
      registros.forEach((registro, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="date" value="${registro.fecha || ''}" data-index="${index}" class="edit-date"></td>
          <td><input type="number" value="${registro.precio || 0}" data-index="${index}" class="edit-price"></td>
          <td><button class="delete-row" data-index="${index}">Eliminar</button></td>
        `;
        tableBody.appendChild(row);
      });
    };
  
    const renderChart = () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
  
      const labels = registros.map((registro) => registro.fecha);
      const data = registros.map((registro) => registro.precio);
  
      chartInstance = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Precio por Fecha',
              data,
              borderColor: 'rgba(214, 92, 79, 1)',
              backgroundColor: 'rgba(214, 92, 79, 0.2)',
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: 'Fecha' },
            },
            y: {
              title: { display: true, text: 'Precio' },
              beginAtZero: true,
            },
          },
        },
      });
    };
  
    const saveChanges = async () => {
      try {
        const validRegistros = registros.filter(
          (registro) => registro.fecha && !isNaN(parseFloat(registro.precio))
        );
  
        const response = await fetch(`/api/registros/${productId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registros: validRegistros.map((registro) => ({
              ...registro,
              evento: 'sim', // Aseguramos que el evento sea 'sim'
            })),
          }),
        });
  
        if (!response.ok) {
          const error = await response.json();
          console.error('Error del servidor:', error);
          alert('Error al guardar los cambios.');
          return;
        }
  
        alert('Cambios guardados correctamente.');
        await fetchRegistros();
      } catch (error) {
        console.error('Error al guardar los cambios:', error);
      }
    };
  
    const addRow = () => {
      registros.push({ fecha: '', precio: 0 });
      renderTable();
    };
  
    tableBody.addEventListener('change', (event) => {
      const index = event.target.dataset.index;
      const field = event.target.classList.contains('edit-date') ? 'fecha' : 'precio';
      registros[index][field] = event.target.value;
      renderChart();
    });
  
    tableBody.addEventListener('click', (event) => {
      if (event.target.classList.contains('delete-row')) {
        const index = event.target.dataset.index;
        registros.splice(index, 1);
        renderTable();
        renderChart();
      }
    });
  
    saveChangesButton.addEventListener('click', saveChanges);
    addRowButton.addEventListener('click', addRow);
  
    fetchRegistros();
  });
  