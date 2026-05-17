
// ─── EMAILJS CONFIG — same keys as cart.html ────────────────────────────────
const EMAILJS_PUBLIC_KEY  = "z1HmEmD3LZ7wap7my";
const EMAILJS_SERVICE_ID  = "service_in6scmt";
const TEMPLATE_CONFIRM    = "template_6bxekmf";
// ─────────────────────────────────────────────────────────────────────────────

emailjs.init(EMAILJS_PUBLIC_KEY);

const userName    = sessionStorage.getItem("userName")    || "Customer";
const userEmail   = sessionStorage.getItem("userEmail");
const orderId     = sessionStorage.getItem("pendingOrderRef")     || "N/A";
const orderAmount = sessionStorage.getItem("pendingOrderAmount")  || "0";
const orderDetails= sessionStorage.getItem("pendingOrderDetails") || "";

// Render order summary on the page
function renderSummary() {
    const listEl = document.getElementById("order-items-list");
    const totalEl= document.getElementById("order-total-display");

    if (orderDetails) {
        // Parse the text lines back into rows for display
        const lines = orderDetails.split("\n").filter(l => l.trim());
        let html = "";
        for (const line of lines) {
            if (line.match(/^\d+\./)) {
                // Product name line
                const name = line.replace(/^\d+\.\s*/, "").split("\n")[0];
                html += `<div class="order-item-row"><span class="name">${name}</span></div>`;
            } else if (line.trim().startsWith("Qty")) {
                // Qty/price line
                const parts = line.trim().split("=");
                const subtotal = parts[1] ? parts[1].trim() : "";
                const qty = parts[0] ? parts[0].trim() : "";
                html += `<div class="order-item-row"><span style="color:#888;font-size:12px;">${qty}</span><span class="amount">${subtotal}</span></div>`;
            }
        }
        listEl.innerHTML = html || `<div class="order-item-row"><span>Your items</span></div>`;
    } else {
        listEl.innerHTML = `<div class="order-item-row"><span>Order #${orderId}</span></div>`;
    }

    const amount = parseInt(orderAmount) || 0;
    totalEl.textContent = "₹" + amount.toLocaleString("en-IN");
}

renderSummary();

// Pay button
document.getElementById("pay-btn").addEventListener("click", async () => {
    const upiId  = document.getElementById("upi-id").value.trim();
    const upiPin = document.getElementById("upi-pin").value.trim();
    const status = document.getElementById("pay-status");

    if (!upiId) {
        status.textContent = "❌ Please enter your UPI ID.";
        status.style.color = "red"; return;
    }
    if (!upiPin || upiPin.length < 4) {
        status.textContent = "❌ Please enter a valid 4 or 6 digit PIN.";
        status.style.color = "red"; return;
    }

    const btn = document.getElementById("pay-btn");
    btn.disabled = true;
    btn.textContent = "Processing...";
    status.textContent = "⏳ Verifying payment...";
    status.style.color = "#666";

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 2000));

    status.textContent = "✅ Payment verified! Sending confirmation...";
    status.style.color = "green";

    // Send confirmation email
    try {
        if (userEmail) {
            await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_CONFIRM, {
                user_name:      userName,
                user_email:     userEmail,
                order_id:       orderId,
                order_details:  orderDetails,
                total_amount:   "₹" + parseInt(orderAmount).toLocaleString("en-IN"),
                payment_method: "UPI (" + upiId + ")"
            });
        }
    } catch(e) {
        console.error("Email error:", e);
        // Don't block the success screen even if email fails
    }

    // Clear pending order from session
    sessionStorage.removeItem("pendingOrderId");
    sessionStorage.removeItem("pendingOrderAmount");
    sessionStorage.removeItem("pendingOrderDetails");
    sessionStorage.removeItem("pendingOrderRef");

    // Show success screen
    await new Promise(r => setTimeout(r, 800));
    document.getElementById("payment-form-section").style.display = "none";
    document.getElementById("success-screen").style.display = "block";
});
