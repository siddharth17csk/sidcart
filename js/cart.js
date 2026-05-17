
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ─── EMAILJS CONFIG — Replace these with your own ───────────────────────────
const EMAILJS_PUBLIC_KEY   = "z1HmEmD3LZ7wap7my";   // from EmailJS Account page
const EMAILJS_SERVICE_ID   = "service_in6scmt";           // e.g. service_abc123
const TEMPLATE_UPI         = "template_7s2xvsh";      // e.g. template_upi123
const TEMPLATE_CONFIRM     = "template_6bxekmf";  // e.g. template_confirm123
// ─────────────────────────────────────────────────────────────────────────────

emailjs.init(EMAILJS_PUBLIC_KEY);

const firebaseConfig = {
    apiKey: "AIzaSyBIKDCZ1sHZb1H94slOhTTxK79h9TSvlCg",
    authDomain: "sidcart-e1082.firebaseapp.com",
    projectId: "sidcart-e1082",
    storageBucket: "sidcart-e1082.firebasestorage.app",
    messagingSenderId: "523171688101",
    appId: "1:523171688101:web:1b93197136b381329aa74c"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const uid = sessionStorage.getItem("uid");
if (!uid) { window.location.href = "login.html"; }

const cartKey = "cart_" + uid;
let cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
let selectedPayment = "cash";
let creditLimit = parseInt(sessionStorage.getItem("creditLimit") || "1000");

// Payment toggle
document.querySelectorAll(".payment-opt").forEach(opt => {
    opt.addEventListener("click", () => {
        document.querySelectorAll(".payment-opt").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
        selectedPayment = opt.dataset.method;
        document.getElementById("credit-info").style.display = selectedPayment === "credit" ? "block" : "none";
    });
});

function saveCart() { localStorage.setItem(cartKey, JSON.stringify(cart)); }

// Build a plain-text order details string for emails
function buildOrderDetails(cartItems) {
    return cartItems.map((item, i) =>
        `${i+1}. ${item.title}${item.brand ? " (" + item.brand + ")" : ""}\n   Qty: ${item.qty}  x  ₹${item.price.toLocaleString("en-IN")}  =  ₹${(item.price * item.qty).toLocaleString("en-IN")}`
    ).join("\n");
}

function renderCart() {
    const container = document.getElementById("cart-items-container");
    const summary   = document.getElementById("summary-card");

    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart">
            <span class="icon">🛒</span>
            <h2>Your cart is empty</h2>
            <p>Add some amazing products to your cart</p>
            <a href="shop.html">Shop Now</a>
        </div>`;
        summary.style.display = "none";
        return;
    }

    summary.style.display = "block";
    let total = 0;
    container.innerHTML = cart.map((item, i) => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        return `<div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/90?text=No+Image'}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/90?text=No+Image'">
            <div class="cart-item-info">
                <div class="brand">${item.brand || ""}</div>
                <div class="title">${item.title}</div>
                <div class="price">₹${item.price.toLocaleString("en-IN")}</div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
                    <span class="qty-display">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
                    <span class="item-total">= ₹${subtotal.toLocaleString("en-IN")}</span>
                    <button class="remove-btn" onclick="removeItem(${i})" style="margin-left:auto;">🗑️ Remove</button>
                </div>
            </div>
        </div>`;
    }).join("");

    document.getElementById("item-count-label").textContent = cart.length + " item" + (cart.length > 1 ? "s" : "");
    document.getElementById("summary-items").textContent  = "₹" + total.toLocaleString("en-IN");
    document.getElementById("summary-total").textContent  = "₹" + total.toLocaleString("en-IN");
    document.getElementById("credit-limit-display").textContent = creditLimit;
    document.getElementById("credit-used").textContent    = total > creditLimit ? creditLimit : total;
    document.getElementById("credit-available").textContent = Math.max(0, creditLimit - total);
}

window.changeQty = function(index, delta) {
    const item = cart[index];
    const newQty = item.qty + delta;
    if (newQty < 1) return;
    if (newQty > (item.maxQty || 999)) { alert("Cannot exceed available stock (" + item.maxQty + ")"); return; }
    cart[index].qty = newQty;
    saveCart(); renderCart();
};

window.removeItem = function(index) {
    cart.splice(index, 1);
    saveCart(); renderCart();
};

// ── CHECKOUT ────────────────────────────────────────────────────────────────
document.getElementById("checkout-btn").addEventListener("click", async () => {
    const status = document.getElementById("checkout-status");
    if (cart.length === 0) { status.textContent = "Cart is empty."; status.style.color = "red"; return; }

    const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const userName = sessionStorage.getItem("userName") || "Customer";
    const userEmail= sessionStorage.getItem("userEmail");

    if (selectedPayment === "credit" && total > creditLimit) {
        status.textContent = "❌ Total ₹" + total + " exceeds your credit limit of ₹" + creditLimit;
        status.style.color = "red"; return;
    }

    const btn = document.getElementById("checkout-btn");
    btn.disabled = true; btn.textContent = "Placing order...";
    status.textContent = "";

    try {
        // 1. Save order to Firestore
        const orderRef = await addDoc(collection(db, "orders"), {
            userId: uid, userName,
            items: cart, totalAmount: total,
            paymentMethod: selectedPayment,
            status: selectedPayment === "upi" ? "pending_payment" : "confirmed",
            orderDate: new Date()
        });

        // 2. Save sales record
        await addDoc(collection(db, "sales"), {
            userId: uid, userName,
            orderId: orderRef.id,
            items: cart, totalAmount: total,
            paymentMethod: selectedPayment,
            saleDate: new Date()
        });

        // 3. Update product stock
        for (const item of cart) {
            const productRef  = doc(db, "products", item.id);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const currentQty = productSnap.data().qty || 0;
                await updateDoc(productRef, { qty: Math.max(0, currentQty - item.qty) });
            }
        }

        // 4. Update credit limit if credit payment
        if (selectedPayment === "credit") {
            await updateDoc(doc(db, "users", uid), { creditLimit: Math.max(0, creditLimit - total) });
            sessionStorage.setItem("creditLimit", Math.max(0, creditLimit - total));
        }

        const orderDetails = buildOrderDetails(cart);
        const orderId = orderRef.id.slice(-8).toUpperCase();

        // ── EMAIL LOGIC ─────────────────────────────────────────────────────
        if (selectedPayment === "upi" && userEmail) {
            // Store pending order info for payment page
            sessionStorage.setItem("pendingOrderId",    orderRef.id);
            sessionStorage.setItem("pendingOrderAmount",total);
            sessionStorage.setItem("pendingOrderDetails", orderDetails);
            sessionStorage.setItem("pendingOrderRef",   orderId);

            // Send UPI payment email with dummy link
            const paymentLink = window.location.origin + "/payment.html?order=" + orderRef.id;
            await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_UPI, {
                user_name:    userName,
                user_email:   userEmail,
                order_id:     orderId,
                order_details: orderDetails,
                total_amount: "₹" + total.toLocaleString("en-IN"),
                payment_link: paymentLink
            });

            status.textContent = "📧 Payment link sent to " + userEmail + "! Redirecting...";
            status.style.color = "green";

            localStorage.removeItem(cartKey);
            cart = [];
            setTimeout(() => window.location.href = "payment.html?order=" + orderRef.id, 2000);

        } else {
            // Cash or Credit — send order confirmation email directly
            if (userEmail) {
                await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_CONFIRM, {
                    user_name:     userName,
                    user_email:    userEmail,
                    order_id:      orderId,
                    order_details: orderDetails,
                    total_amount:  "₹" + total.toLocaleString("en-IN"),
                    payment_method: selectedPayment === "cash" ? "Cash on Delivery" : "Credit"
                });
            }

            status.textContent = "✅ Order placed! Confirmation sent to " + (userEmail || "your email") + ". Redirecting...";
            status.style.color = "green";

            localStorage.removeItem(cartKey);
            cart = [];
            setTimeout(() => window.location.href = "orders.html", 2000);
        }

    } catch (e) {
        status.textContent = "❌ " + e.message;
        status.style.color = "red";
        btn.disabled = false; btn.textContent = "Place Order ✅";
        console.error(e);
    }
});

renderCart();
