// Aquí puedes agregar funcionalidad adicional usando JavaScript si es necesario
document.addEventListener('DOMContentLoaded', function () {
    console.log("Página cargada");
var scrollAnimElements = document.querySelectorAll("[data-animate-on-scroll]");
var observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        const targetElement = entry.target;
        targetElement.classList.add("animate");
        observer.unobserve(targetElement);
      }
    }
  },
  {
    threshold: 0.15,
  }
);

for (let i = 0; i < scrollAnimElements.length; i++) {
  observer.observe(scrollAnimElements[i]);
}
});