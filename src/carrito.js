document.addEventListener("DOMContentLoaded", function () {
  fetch("/api/direccionesCarrito") // 🔹 Endpoint correcto para el carrito
    .then(response => response.json())
    .then(data => {
      //console.log("📌 Direcciones obtenidas del backend (Carrito):", data);

      const addressName = document.getElementById("address-name");
      const addressDetails = document.getElementById("address-details");
      const changeAddressButton = document.getElementById("change-address");

      if (data.length === 0) {
        // 🔹 No hay direcciones registradas
        addressName.textContent = "No tienes direcciones";
        addressDetails.textContent = "";
        changeAddressButton.textContent = "Crear Dirección";
        changeAddressButton.onclick = () => (window.location.href = "/perfil");
        return;
      }

      // 🔍 Buscar la dirección con `Seleccionada = 't'`
      const selected = data.find(addr => addr.Seleccionada === 't');

      if (selected) {
        //console.log("✅ Dirección seleccionada encontrada:", selected);
        updateSelectedAddress(selected);
        changeAddressButton.textContent = "Cambiar";
      } else {
        //console.warn("⚠️ No se encontró ninguna dirección con Seleccionada = 't'. Mostrando opción de selección.");
        addressName.textContent = "Recoger en tienda";
        addressDetails.textContent = "";
        changeAddressButton.textContent = "Seleccionar una dirección";
      }

      // 📝 Mostrar todas las direcciones en el modal
      const addressList = document.getElementById("address-list");
      addressList.innerHTML = ""; // Limpiar lista antes de agregar direcciones

      data.forEach(direccion => {
        ////console.log(`🧐 Dirección: ${direccion.nombre_direccion} - Seleccionada: ${direccion.Seleccionada}`);

        const li = document.createElement("li");
        li.innerHTML = `<span>${direccion.nombre_direccion} - ${direccion.calle}, ${direccion.colonia}, ${direccion.ciudad}, ${direccion.estado}, ${direccion.cp}</span> `;

        li.style.cursor = "pointer";

        li.addEventListener("click", async () => {
          await selectAddress(direccion.direccion_id);
          updateSelectedAddress(direccion);
          document.getElementById("address-modal").style.display = "none";
          changeAddressButton.textContent = "Cambiar"; // Cambiar texto del botón
        });

        addressList.appendChild(li);
      });

      // 🔹 Agregar opción especial "Recoger en tienda"
      const recogerTiendaLi = document.createElement("li");
      recogerTiendaLi.innerHTML = `<span><strong>Recoger en tienda</strong></span>`;
      recogerTiendaLi.style.cursor = "pointer";
      recogerTiendaLi.style.color = "#007bff"; // Color distintivo

      recogerTiendaLi.addEventListener("click", async () => {
        await selectAddress("recoger-en-tienda"); // 🔹 Envía el ID especial
        updateSelectedAddress({ nombre_direccion: "Recoger en tienda", calle: "" });
        document.getElementById("address-modal").style.display = "none";
        changeAddressButton.textContent = "Cambiar"; // Cambiar texto del botón
      });

      addressList.appendChild(recogerTiendaLi);

    })
    .catch(error => console.error("❌ Error al cargar direcciones (Carrito):", error));
});

// 🔹 Función para actualizar la dirección en el HTML
function updateSelectedAddress(address) {
  //console.log("🔄 Dirección seleccionada en el HTML (Carrito):", address);
  document.getElementById("address-name").textContent = address.nombre_direccion;
  document.getElementById("address-details").textContent =
    `${address.calle}, ${address.colonia}, ${address.ciudad}, ${address.estado}, ${address.cp}`;
}

// Endpoint para cambiar la dirección seleccionada en el carrito
// ✅ **MODIFICACIÓN: Se recarga la página después de seleccionar una dirección**
async function selectAddress(direccionId) {
  try {
    const response = await fetch("/api/direccionesCarrito/seleccionar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direccion_id: direccionId }),
    });

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    // 🔹 Recargar la página para actualizar el flete y reflejar la nueva dirección seleccionada
    location.reload();

  } catch (error) {
    console.error("❌ Error al seleccionar dirección (Carrito):", error);
  }
}

// Manejo del modal
document.getElementById("change-address").addEventListener("click", function () {
  document.getElementById("address-modal").style.display = "flex";
});

window.addEventListener("click", function (event) {
  if (event.target === document.getElementById("address-modal")) {
    document.getElementById("address-modal").style.display = "none";
    
  }
});




//cargar carrito
// Cargar carrito
document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.querySelector(".cart-items");
  const totalItemsElement = document.querySelector(".total-items");
  const totalPriceElement = document.querySelector(".total-price");

  // Cargar productos del carrito desde el backend
  async function loadCart() {
    try {
      const response = await fetch("/api/carrito");

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("📌 Datos recibidos del carrito:", data); // 🔹 Agregado para depuración

      if (data.success && data.carrito) {
        renderCartItems(data.carrito, data.flete);
      } else {
        alert("Error al cargar el carrito.");
      }
    } catch (error) {
      console.error("❌ Error al cargar el carrito:", error);
    }
  }

  // Renderizar los productos en el carrito
  function renderCartItems(cartItems, flete) {
    cartItemsContainer.innerHTML = "";
    let totalItems = 0;
    let totalPrice = 0;

    cartItems.forEach((item) => {
      const { producto_nombre, color, precio, cantidad, disponibilidad, path_imagen, producto_id } = item;

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
          <p class="product-price">Precio: $${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
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

    // Actualizar resumen del carrito con flete
    updateCartSummary(totalItems, totalPrice, flete);
  }

  // Actualizar el resumen del carrito
  function updateCartSummary(totalItems, totalPrice, flete) {
    const totalItemsElement = document.querySelector(".total-items");
    const totalPriceElement = document.querySelector(".total-price");
    const envioElement = document.querySelector(".shipping-cost");
    const totalFinalElement = document.querySelector(".final-total");

    console.log("🔹 Flete recibido en updateCartSummary:", flete); // 🔹 Agregado para depuración

    // Asegurar que flete es un número válido
    flete = isNaN(flete) ? 0 : parseFloat(flete);

    // Actualizar total de productos y precio
    totalItemsElement.textContent = totalItems;
    totalPriceElement.textContent = `$${totalPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    // Mostrar el costo de envío si hay dirección seleccionada, sino "Recoger en tienda - $0 MXN"
    envioElement.textContent = flete > 0
      ? `$${flete.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`
      : "Recoger en tienda - $0 MXN";

    // Sumar el flete al total final
    totalFinalElement.textContent = `$${(totalPrice + flete).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
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

      try {
        // Actualizar cantidad en el backend
        const response = await fetch(`/api/carrito/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error HTTP al actualizar cantidad: ${response.status}`);
        }

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

      try {
        // Eliminar producto del carrito
        const response = await fetch(`/api/carrito/${carritoId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Error HTTP al eliminar producto: ${response.status}`);
        }

        // ✅ Refrescar toda la página para actualizar Mercado Pago y el carrito
        location.reload();

      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(error.message);
      }
    }
  });

  // Inicializar el carrito
  console.log("✅ Inicializando el carrito...");
  loadCart();
});






