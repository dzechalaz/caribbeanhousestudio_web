function ajustarEscalado() {
  const anchoBase = 1920; // Ancho base del diseño original
  const altoBase = 1080; // Alto base del diseño original

  const anchoVentana = window.innerWidth; // Ancho actual de la ventana
  const altoVentana = window.innerHeight; // Alto actual de la ventana

  // Verifica si las dimensiones de la ventana son iguales o mayores al diseño base
  if (anchoVentana >= anchoBase && altoVentana >= altoBase) {
    const mainContent = document.getElementById('main-content');
    mainContent.style.transform = ''; // Elimina cualquier transformación
    mainContent.style.width = ''; // Restaura el ancho original
    mainContent.style.height = ''; // Restaura el alto original
    document.documentElement.style.overflowX = ''; // Restaura el scroll si estaba oculto
    return; // Detiene la función para no aplicar escalado
  }

  // Calcula la escala basada en el menor ratio entre ancho y alto
  const escala = Math.min(anchoVentana / anchoBase, altoVentana / altoBase);

  // Aplica la escala al contenido principal
  const mainContent = document.getElementById('main-content');
  mainContent.style.transform = `scale(${escala})`;
  mainContent.style.transformOrigin = 'top left'; // Escala desde la esquina superior izquierda
  mainContent.style.width = `${anchoBase}px`; // Fija el ancho base
  mainContent.style.height = `${altoBase}px`; // Fija el alto base

  // Evita scroll horizontal
  document.documentElement.style.overflowX = 'hidden';
}

// Llama a la función al cargar la página
window.addEventListener('load', ajustarEscalado);

// Llama a la función al redimensionar la ventana
window.addEventListener('resize', ajustarEscalado);
