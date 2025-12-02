import { BACKEND_URL } from "./config.js";

// --- REFERENCIAS A ELEMENTOS ---
const ordersContainer = document.getElementById("orders-container");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const btnRefresh = document.getElementById("btn-refresh");

// --- LÓGICA PRINCIPAL ---

function getStatusColor(status) {
  switch (status) {
    case "Confirmado": return "bg-blue-100 text-blue-800";
    case "En Preparación": return "bg-yellow-100 text-yellow-800";
    case "En Camino": return "bg-indigo-100 text-indigo-800";
    case "Entregado": return "bg-green-100 text-green-800";
    case "Cancelado": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function renderOrder(order) {
  const orderTotal = (order.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemsHTML = (order.items || [])
    .map(item => `<li class="flex justify-between"><span>${item.quantity}x ${item.name}</span><span>Bs ${(item.price * item.quantity).toFixed(2)}</span></li>`)
    .join("");

  const orderCard = document.createElement("div");
  orderCard.className = "bg-white rounded-lg shadow p-5 border border-gray-100";
  orderCard.innerHTML = `
        <div class="flex flex-wrap justify-between items-center border-b pb-3 mb-3">
            <div>
                <h2 class="text-xl font-bold text-gray-800">Pedido #${order.id}</h2>
                <p class="text-sm text-gray-500">Cliente: ${order.customer_name || order.chat_id || "Anónimo"}</p>
                <p class="text-sm text-gray-500">${new Date(order.date).toLocaleString("es-ES")}</p>
            </div>
            <div class="mt-2 sm:mt-0">
                <span class="text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}">${order.status}</span>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 class="font-bold mb-2 text-gray-700">Productos:</h3>
                <ul class="space-y-1 text-sm text-gray-600">${itemsHTML}</ul>
                <p class="font-bold text-right mt-2 text-gray-800">Total: Bs ${orderTotal.toFixed(2)}</p>
            </div>
            <div>
                <h3 class="font-bold mb-2 text-gray-700">Entrega:</h3>
                <p class="text-sm text-gray-600"><strong>Dir:</strong> ${order.address || "Sin dirección"}</p>
                <p class="text-sm text-gray-600"><strong>Pago:</strong> ${order.paymentMethod || "-"}</p>
            </div>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-100">
            <label class="block text-sm font-medium text-gray-700 mb-1">Actualizar Estado:</label>
            <div class="flex items-center space-x-2">
                <select id="status-${order.id}" class="status-select block w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5">
                    <option value="Confirmado" ${order.status === "Confirmado" ? "selected" : ""}>Confirmado</option>
                    <option value="En Preparación" ${order.status === "En Preparación" ? "selected" : ""}>En Preparación</option>
                    <option value="En Camino" ${order.status === "En Camino" ? "selected" : ""}>En Camino</option>
                    <option value="Entregado" ${order.status === "Entregado" ? "selected" : ""}>Entregado</option>
                    <option value="Cancelado" ${order.status === "Cancelado" ? "selected" : ""}>Cancelado</option>
                </select>
                <button class="btn-update-status bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors" data-order-id="${order.id}">
                    Guardar
                </button>
            </div>
        </div>
    `;
  return orderCard;
}

// --- FETCH DATA ---
async function fetchAndDisplayOrders() {
  if(!ordersContainer) return;

  loadingMessage.classList.remove("hidden");
  ordersContainer.classList.add("hidden");
  errorMessage.classList.add("hidden");
  ordersContainer.innerHTML = "";

  try {
    const response = await fetch(`${BACKEND_URL}/get_orders`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
    }
    const orders = await response.json();

    if (orders.length === 0) {
      loadingMessage.innerHTML = '<p class="text-gray-600 text-lg">No hay pedidos activos en este momento.</p>';
    } else {
      orders.sort((a, b) => new Date(b.date) - new Date(a.date));
      orders.forEach((order) => {
        ordersContainer.appendChild(renderOrder(order));
      });
      loadingMessage.classList.add("hidden");
      ordersContainer.classList.remove("hidden");
    }
  } catch (error) {
    if(errorText) errorText.textContent = `No se pudieron cargar los pedidos. ${error.message}`;
    if(errorMessage) errorMessage.classList.remove("hidden");
    if(loadingMessage) loadingMessage.classList.add("hidden");
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`${BACKEND_URL}/update_status/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      const result = await response.json();
      alert(result.message || "Estado actualizado.");
      fetchAndDisplayOrders();
      return;
    }
    
    alert(`Error al actualizar: ${response.status}`);
  } catch (error) {
    alert(`Error al actualizar el estado: ${error.message}`);
  }
}

// --- EVENT LISTENERS ---
btnRefresh.addEventListener("click", fetchAndDisplayOrders);

ordersContainer.addEventListener("click", (e) => {
    const button = e.target.closest(".btn-update-status");
    if (button) {
        const orderId = button.dataset.orderId;
        const select = document.getElementById(`status-${orderId}`);
        const newStatus = select.value;
        button.textContent = "Guardando...";
        button.disabled = true;
        updateOrderStatus(orderId, newStatus).finally(() => {
            button.textContent = "Guardar";
            button.disabled = false;
        });
    }
});

// Auto-init
document.addEventListener("DOMContentLoaded", fetchAndDisplayOrders);
