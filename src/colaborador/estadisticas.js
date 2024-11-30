document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Fetch data from API
      const response = await fetch('/api/estadisticas');
      const data = await response.json();
  
      // Gráfica de visitas por día
      const visitasCtx = document.getElementById('visitasChart').getContext('2d');
      new Chart(visitasCtx, {
        type: 'line',
        data: {
          labels: data.visitasPorDia.map(item => {
            const fecha = new Date(item.fecha);
            return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
          }),
          datasets: [
            {
              label: 'Visitas',
              data: data.visitasPorDia.map(item => item.total),
              borderColor: '#D65C4F',
              backgroundColor: 'rgba(214, 92, 79, 0.2)',
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Días',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Cantidad de Visitas',
              },
              beginAtZero: true,
            },
          },
        },
      });
  
      // Rellenar Top 5 Más Vendidos
      const topVendidosTable = document.getElementById('topVendidos');
      topVendidosTable.innerHTML = ''; // Clear existing rows
      data.topVendidos.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${producto.nombre}</td>
          <td>${producto.totalVentas}</td>
        `;
        topVendidosTable.appendChild(row);
      });
  
      // Rellenar Top 5 Más Visitados
      const topVisitadosTable = document.getElementById('topVisitados');
      topVisitadosTable.innerHTML = ''; // Clear existing rows
      data.topVisitados.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${producto.nombre}</td>
          <td>${producto.totalVisitas}</td>
        `;
        topVisitadosTable.appendChild(row);
      });
    } catch (error) {
      console.error('Error al cargar las estadísticas:', error);
    }
  });
  