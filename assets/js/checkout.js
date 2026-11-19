(function () {
  "use strict";

  var paymentBox = document.querySelector("[data-course-payment][data-course-id]");
  if (!paymentBox) return;

  var courseId = paymentBox.getAttribute("data-course-id");
  var buttons = paymentBox.querySelectorAll("[data-checkout-payment-type]");
  var status = paymentBox.querySelector("[data-checkout-status]");

  function setBusy(activeButton, busy) {
    buttons.forEach(function (button) {
      button.disabled = busy;
      button.setAttribute("aria-disabled", busy ? "true" : "false");
    });
    if (activeButton) {
      if (!activeButton.dataset.originalLabel) activeButton.dataset.originalLabel = activeButton.textContent;
      activeButton.textContent = busy ? "Abriendo pago seguro…" : activeButton.dataset.originalLabel;
    }
  }

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", async function () {
      var paymentType = button.getAttribute("data-checkout-payment-type");
      if (paymentType !== "deposit" && paymentType !== "full") return;

      setStatus("Conectando con Stripe…", false);
      setBusy(button, true);

      try {
        var response = await fetch("/.netlify/functions/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: courseId, paymentType: paymentType })
        });
        var data = await response.json();
        if (!response.ok || !data.url) throw new Error(data.error || "No se pudo iniciar el pago.");
        window.location.assign(data.url);
      } catch (error) {
        setStatus(error.message || "No se pudo iniciar el pago. Inténtalo de nuevo.", true);
        setBusy(button, false);
      }
    });
  });
})();

