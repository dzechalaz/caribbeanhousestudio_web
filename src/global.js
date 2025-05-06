// ==== global.js ====  

// 1) Funciones para mostrar/ocultar el sidebar  
function toggleMenu() {  
  document.querySelector('.menu-container').classList.toggle('active');  
}  
function hideSidebar() {  
  document.querySelector('.menu-container').classList.remove('active');  
}  
window.toggleMenu = toggleMenu;  
window.hideSidebar = hideSidebar;  

function ajustarEscalado() {
  const anchoBase = 1920; // Ancho base del diseño original
  const altoBase = 1080; // Alto base del diseño original

  const anchoVentana = window.innerWidth; // Ancho actual de la ventana
  const altoVentana = window.innerHeight; // Alto actual de la ventana

  // Verifica si las dimensiones de la ventana son iguales o mayores al diseño base
  if (anchoVentana <= 1200 && anchoVentana >= 1024) {
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
  else {
    return; // Detiene la función para no aplicar escalado
  }
}


// 3) Inicialización de barra: sesión, login/Perfil y carrito  
function inicializarBarra() {  
  // Selectores  
  const loginWrapper  = document.querySelector('#login-wrapper3');  
  const loginText     = document.querySelector('.login5');  
  const cartDesktop   = document.getElementById('cart-container');  
  const loginMobile   = document.querySelector('.sidebar-burger a.login-link');  
  const perfilDesktop = document.querySelector('#perfil-link');  
  const perfilMobile  = document.querySelector('.sidebar-burger a.perfil-link');  
  const cartMobile    = document.querySelector('.sidebar-burger a.cart-link');  

  // Configuración por defecto: loginWrapper → /login  
  if (loginWrapper) {
    loginWrapper.onclick = () => window.location.href = '/login';
  }

  fetch('/api/session')  
    .then(res => res.json())  
    .then(data => {  
      if (data.isAuthenticated) {  
        // Desktop: convertir Login en Mi Perfil  
        if (loginWrapper && loginText) {  
          loginWrapper.style.backgroundColor = '#C19A6B';  
          loginText .style.top             = '-0px'; 
      
          loginWrapper.style.top             = '-10px';  
          loginText.textContent              = 'Mi Perfil';  
          loginWrapper.onclick               = () => window.location.href = '/perfil';  
          // Centrar texto en el botón  
          loginWrapper.style.display        = 'flex';  
          loginWrapper.style.justifyContent = 'center';  
          loginWrapper.style.alignItems     = 'center';  
          // ← Aquí ajustas los píxeles que quieras
          

        }  
        // Mostrar/Ocultar desktop links  
        if (loginWrapper)  loginWrapper.style.display = 'flex';  
        if (perfilDesktop) {  
          perfilDesktop.style.display     = 'block';  
          perfilDesktop.style.color       = '#E65C00';  
          perfilDesktop.style.fontWeight  = 'bold';  
          perfilDesktop.onclick           = () => window.location.href = '/perfil';  
        }  
        if (cartDesktop) cartDesktop.style.display = 'flex';  

        // Mobile: mostrar perfil, ocultar login  
        if (loginMobile)  loginMobile.style.display  = 'none';  
        if (perfilMobile) {
          perfilMobile.style.display    = 'block';  
          perfilMobile.style.color      = '#E65C00';  
          perfilMobile.style.fontWeight = 'bold';  
        }
        if (cartMobile) cartMobile.style.display = 'block';  
      /* rest unchanged below */  
        if (loginMobile)  loginMobile.style.display  = 'none';  
        if (perfilMobile) {
          perfilMobile.style.display    = 'block';  
          perfilMobile.style.color      = '#E65C00';  
          perfilMobile.style.fontWeight = 'bold';  
        }
        if (cartMobile) cartMobile.style.display = 'block';  
      } else {  
        // No autenticado: mostrar login, ocultar perfil y carrito  
        if (loginWrapper) {
          loginWrapper.style.display        = 'flex';
          loginWrapper.style.justifyContent = 'center';  // centra en X
          loginWrapper.style.alignItems     = 'center';  // centra en Y
        }
        if (loginMobile)   loginMobile.style.display  = 'block';  
        if (perfilDesktop) perfilDesktop.style.display = 'none';  
        if (perfilMobile)  perfilMobile.style.display  = 'none';  
        if (cartDesktop)   cartDesktop.style.display   = 'none';  
        if (cartMobile)    cartMobile.style.display    = 'none';  
      }  
    })  
    .catch(err => console.error('Error al verificar sesión:', err));  
}  

// 4) Carga dinámica de barra y footer, resalte de la pestaña activa  
function loadTemplates(highlightClass) {  
  Promise.all([  
    fetch('/Templates/barra.html').then(r => r.text()),  
    fetch('/Templates/footer.html').then(r => r.text())  
  ])  
  .then(([barraHTML, footerHTML]) => {  
    document.getElementById('barra').innerHTML  = barraHTML;  
    document.getElementById('footer').innerHTML = footerHTML;  

    // Resaltar en menú principal  
    document.querySelectorAll(`.menu-items .${highlightClass}`).forEach(el => {  
      el.style.fontWeight = 'bold';  
      el.style.color      = 'var(--color-lightseagreen)';  
    });  

    // Resaltar en sidebar  
    const path = window.location.pathname;  
    document.querySelectorAll('.sidebar-burger a').forEach(a => {  
      if (a.getAttribute('href') === path) {  
        a.classList.add('active');  
      }  
    });  

    inicializarBarra();  
  })  
  .catch(error => console.error('Error cargando templates:', error));  
}  

// 5) Eventos globales  
window.addEventListener('load', ajustarEscalado);  
window.addEventListener('resize', ajustarEscalado);  
window.loadTemplates = loadTemplates;  
