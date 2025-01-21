document.addEventListener('DOMContentLoaded', async () => {
  const limiteSelector = document.getElementById('limite');
  let visitasChartInstance = null; // Variable para almacenar la instancia del gráfico

  const cargarEstadisticas = async (limite = 5) => {
    try {
      // Fetch data from API con el límite seleccionado
      const response = await fetch(`/api/estadisticas?limite=${limite}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Verificar si se recibió la estructura de datos esperada
      console.log('Datos recibidos:', data);

      // Destruir el gráfico anterior, si existe
      if (visitasChartInstance) {
        visitasChartInstance.destroy();
      }

      // Crear el gráfico de visitas por día
      const visitasCtx = document.getElementById('visitasChart').getContext('2d');
      visitasChartInstance = new Chart(visitasCtx, {
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

      // Rellenar Top Más Vendidos
      const topVendidosTable = document.getElementById('topVendidos');
      topVendidosTable.innerHTML = '';
      if (data.topVendidos && data.topVendidos.length > 0) {
        data.topVendidos.forEach(producto => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.totalVentas}</td>
          `;
          topVendidosTable.appendChild(row);
        });
      } else {
        topVendidosTable.innerHTML = '<tr><td colspan="2">No hay datos disponibles</td></tr>';
      }

      // Rellenar Top Más Visitados
      const topVisitadosTable = document.getElementById('topVisitados');
      topVisitadosTable.innerHTML = '';
      if (data.topVisitados && data.topVisitados.length > 0) {
        data.topVisitados.forEach(producto => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${producto.totalVisitas}</td>
          `;
          topVisitadosTable.appendChild(row);
        });
      } else {
        topVisitadosTable.innerHTML = '<tr><td colspan="2">No hay datos disponibles</td></tr>';
      }

      // Rellenar Categorías Más Compradas
      const categoriasTable = document.getElementById('categoriasCompradas');
      categoriasTable.innerHTML = '';
      if (data.categoriasCompradas && data.categoriasCompradas.length > 0) {
        data.categoriasCompradas.forEach(categoria => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${categoria.categoria}</td>
            <td>${categoria.totalCompras}</td>
          `;
          categoriasTable.appendChild(row);
        });
      } else {
        categoriasTable.innerHTML = '<tr><td colspan="2">No hay datos disponibles</td></tr>';
      }
    } catch (error) {
      console.error('Error al cargar las estadísticas:', error);

      // Mostrar mensaje de error en las tablas
      const errorRow = '<tr><td colspan="2">Error al cargar datos</td></tr>';
      document.getElementById('topVendidos').innerHTML = errorRow;
      document.getElementById('topVisitados').innerHTML = errorRow;
      document.getElementById('categoriasCompradas').innerHTML = errorRow;
    }
  };

  // Cargar estadísticas iniciales con límite 5
  await cargarEstadisticas(5);

  // Cambiar estadísticas dinámicamente al seleccionar un nuevo límite
  limiteSelector.addEventListener('change', async () => {
    const nuevoLimite = parseInt(limiteSelector.value, 10);
    await cargarEstadisticas(nuevoLimite);
  });
});
