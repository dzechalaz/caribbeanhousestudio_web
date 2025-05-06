function toggleMenu() {
  document.querySelector('.menu-container').classList.toggle('active');
}
function hideSidebar() {
  document.querySelector('.menu-container').classList.remove('active');
}
window.toggleMenu = toggleMenu;
window.hideSidebar = hideSidebar;
