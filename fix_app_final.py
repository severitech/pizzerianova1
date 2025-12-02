import re

# Leer el archivo
with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. FIX: Agregar .trim() en pollOrderStatus
if 'orderId = String(orderId).trim();' not in content:
    content = content.replace(
        'async function pollOrderStatus(orderId, durationMs = 30000, intervalMs = 5000) {\n  if (!orderId) return;',
        'async function pollOrderStatus(orderId, durationMs = 30000, intervalMs = 5000) {\n  if (!orderId) return;\n  orderId = String(orderId).trim();'
    )

# 2. FIX: Reemplazar el listener de btnSubmitRating completo
# Buscamos el inicio del listener hasta el final de la función init()
# Esto es más seguro que buscar fragmentos
start_marker = 'btnSubmitRating.addEventListener("click", async (e) => {'
end_marker = 'btnGeneratePizza.addEventListener("click", callBackendToCreatePizza);'

new_listener_code = '''btnSubmitRating.addEventListener("click", async (e) => {
    const orderId = e.currentTarget.dataset.orderId;
    const restaurantRating = window.currentRestaurantRating || 0;
    const deliveryRating = window.currentDeliveryRating || 0;
    
    // Leer comentarios separados
    const restaurantComments = document.getElementById("rating-restaurant-comments")?.value.trim() || "";
    const deliveryComments = document.getElementById("rating-delivery-comments")?.value.trim() || "";
    
    // Combinar comentarios si ambos existen
    let combinedComment = "";
    if (restaurantComments && deliveryComments) {
      combinedComment = `Restaurante: ${restaurantComments} | Delivery: ${deliveryComments}`;
    } else if (restaurantComments) {
      combinedComment = `Restaurante: ${restaurantComments}`;
    } else if (deliveryComments) {
      combinedComment = `Delivery: ${deliveryComments}`;
    }

    // Validación: ambas calificaciones son obligatorias
    if (restaurantRating === 0 || deliveryRating === 0) {
      try {
        tg.showAlert(
          "Valoración Incompleta",
          "Por favor, califica tanto el restaurante como el repartidor."
        );
      } catch (e) {
        alert("Por favor, califica tanto el restaurante como el repartidor.");
      }
      return;
    }

    // Mostrar indicador de carga
    try {
      const mb = tg && (tg.mainButton || tg.MainButton);
      if (mb && typeof mb.showProgress === "function") mb.showProgress(true);
    } catch (e) {}

    try {
      // Enviar calificación al backend
      const payload = {
        order_id: String(orderId).trim(), // CRÍTICO: .trim() para evitar error 404
        restaurant_rating: restaurantRating,
        delivery_rating: deliveryRating,
        comment: combinedComment || undefined, // Solo enviar si hay comentario
      };

      console.log("📤 ENVIANDO CALIFICACIÓN AL BACKEND:");
      console.log("URL:", `${BACKEND_URL}/api/rate_order`);
      console.log("Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${BACKEND_URL}/api/rate_order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📥 RESPUESTA DEL BACKEND:");
      console.log("Status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ ERROR DEL BACKEND:", errorData);
        throw new Error(
          errorData.message || `Error ${response.status}: No se pudo enviar la calificación`
        );
      }

      const result = await response.json();
      console.log("✅ RESPUESTA EXITOSA:", result);

      // Marcar pedido como calificado en el estado local
      const order = myOrders.find((o) => o.id == orderId);
      if (order) {
        order.isRated = true;
        order.restaurant_rating = restaurantRating;
        order.delivery_rating = deliveryRating;
        order.rating_comment = combinedComment;
        saveOrdersToStorage();
      }

      // Resetear calificaciones para la próxima vez
      window.currentRestaurantRating = 0;
      window.currentDeliveryRating = 0;
      
      // Limpiar campos de comentarios
      const rComments = document.getElementById("rating-restaurant-comments");
      if (rComments) rComments.value = "";
      const dComments = document.getElementById("rating-delivery-comments");
      if (dComments) dComments.value = "";

      // Feedback exitoso
      try {
        tg.HapticFeedback.notificationOccurred("success");
      } catch (e) {}

      try {
        tg.showAlert(
          "¡Gracias!",
          result.message || "Tu valoración ha sido enviada. ¡Apreciamos tu feedback!"
        );
      } catch (e) {
        alert("¡Gracias! Tu valoración ha sido enviada correctamente.");
      }

      showMyOrdersPage();
    } catch (error) {
      console.error("Error al enviar calificación:", error);
      try {
        tg.showAlert(
          "Error",
          `No pudimos enviar tu calificación. ${error.message}`
        );
      } catch (e) {
        alert(`Error: No pudimos enviar tu calificación. ${error.message}`);
      }
    } finally {
      try {
        const mb = tg && (tg.mainButton || tg.MainButton);
        if (mb && typeof mb.hideProgress === "function") mb.hideProgress();
      } catch (e) {}
    }
  });

  // Event listener para los chips de sugerencias
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".suggestion-chip");
    if (chip) {
      const text = chip.dataset.text;
      const restaurantCommentsField = document.getElementById("rating-restaurant-comments");
      if (restaurantCommentsField && text) {
        const currentValue = restaurantCommentsField.value.trim();
        if (currentValue) {
          // Si ya hay texto, agregar con separador
          restaurantCommentsField.value = currentValue + ". " + text;
        } else {
          // Si está vacío, solo agregar el texto
          restaurantCommentsField.value = text;
        }
        // Hacer focus en el campo para que el usuario vea el cambio
        restaurantCommentsField.focus();
      }
    }
  });

  '''

# Usamos regex para reemplazar el bloque completo
pattern = re.compile(r'btnSubmitRating\.addEventListener\("click", async \(e\) => \{.*?' + re.escape(end_marker), re.DOTALL)
match = pattern.search(content)

if match:
    # Reemplazamos todo el bloque antiguo con el nuevo código + el marcador final
    content = content.replace(match.group(0), new_listener_code + end_marker)
    print("✅ Listener actualizado correctamente")
else:
    print("❌ No se encontró el bloque de código para reemplazar")

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
