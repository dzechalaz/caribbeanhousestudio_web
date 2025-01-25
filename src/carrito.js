document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.querySelector(".cart-items");
  const totalItemsElement = document.querySelector(".total-items");
  const totalPriceElement = document.querySelector(".total-price");

  // Cargar productos del carrito desde el backend
  async function loadCart() {
    try {
      console.log("Cargando el carrito...");
      const response = await fetch("/api/carrito");
      console.log("Respuesta del servidor obtenida:", response);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Datos del carrito obtenidos:", data);

      if (data.success && data.carrito) {
        console.log("Carrito cargado con éxito:", data.carrito);
        renderCartItems(data.carrito);
      } else {
        console.warn("Error al cargar el carrito. Datos recibidos:", data);
        alert("Error al cargar el carrito.");
      }
    } catch (error) {
      console.error("Error al cargar el carrito:", error);
    }
  }

  // Renderizar los productos en el carrito
  function renderCartItems(cartItems) {
    console.log("Renderizando productos en el carrito...");
    cartItemsContainer.innerHTML = "";
    let totalItems = 0;
    let totalPrice = 0;

    cartItems.forEach((item) => {
      const { producto_nombre, color, precio, cantidad, disponibilidad, path_imagen, producto_id } = item;

      console.log("Producto a renderizar:", item);

      // Determinar clase según disponibilidad
      const availabilityClass =
        disponibilidad === "Disponible para envío inmediato" ? "disponible" : "no-disponible";

      const li = document.createElement("li");
      li.classList.add("cart-item");

      li.innerHTML = `
        <a href="/producto?id=${producto_id}" class="product-link">
          <img src="${path_imagen}" alt="${producto_nombre}" class="product-image">
        </a>
        <div class="item-details">
          <p class="product-name">${producto_nombre}</p>
          <p class="product-color">Color: ${color}</p>
          <p class="product-price">Precio: $${precio.toFixed(2)}</p>
          <div class="quantity-container">
            <button class="quantity-btn" data-action="decrease" data-id="${item.carrito_id}">-</button>
            <input type="number" class="quantity-input" value="${cantidad}" min="1" data-id="${item.carrito_id}">
            <button class="quantity-btn" data-action="increase" data-id="${item.carrito_id}">+</button>
          </div>
          <p class="availability ${availabilityClass}">${disponibilidad}</p>
          <button class="delete-item-btn" data-id="${item.carrito_id}">Eliminar</button>
        </div>
      `;

      cartItemsContainer.appendChild(li);

      // Calcular el total
      totalItems += cantidad;
      totalPrice += precio * cantidad;
    });

    // Actualizar resumen del carrito
    updateCartSummary(totalItems, totalPrice);
  }

  // Actualizar el resumen del carrito
  function updateCartSummary(totalItems, totalPrice) {
    console.log("Actualizando resumen del carrito. Total items:", totalItems, "Total price:", totalPrice);
    totalItemsElement.textContent = totalItems;
    totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
  }

  // Manejar el cambio de cantidad
  cartItemsContainer.addEventListener("click", async (e) => {
    if (e.target.classList.contains("quantity-btn")) {
      const action = e.target.dataset.action;
      const carritoId = e.target.dataset.id;
      const input = e.target.closest(".quantity-container").querySelector(".quantity-input");

      let cantidad = parseInt(input.value, 10);
      if (action === "increase") cantidad++;
      if (action === "decrease" && cantidad > 1) cantidad--;

      input.value = cantidad;

      console.log(`Actualizando cantidad: ${cantidad} para el carrito ID: ${carritoId}`);

      try {
        // Actualizar cantidad en el backend
        const response = await fetch(`/api/carrito/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad }),
        });

        console.log("Respuesta al actualizar cantidad:", response);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error HTTP al actualizar cantidad: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos de la respuesta al actualizar cantidad:", data);

        // Recargar el carrito para reflejar cambios
        loadCart();
      } catch (error) {
        console.error("Error al actualizar la cantidad:", error);
        alert(error.message);
      }
    }
  });

  // Manejar eliminación de productos
  cartItemsContainer.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-item-btn")) {
      const carritoId = e.target.dataset.id;

      console.log(`Eliminando producto del carrito. ID: ${carritoId}`);

      try {
        // Eliminar producto del carrito
        const response = await fetch(`/api/carrito/${carritoId}`, {
          method: "DELETE",
        });

        console.log("Respuesta al eliminar producto:", response);

        if (!response.ok) {
          throw new Error(`Error HTTP al eliminar producto: ${response.status}`);
        }

        // Recargar el carrito para reflejar cambios
        loadCart();
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(error.message);
      }
    }
  });

  // Inicializar el carrito
  console.log("Inicializando el carrito...");
  loadCart();
});
