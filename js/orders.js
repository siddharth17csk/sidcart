
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIKDCZ1sHZb1H94slOhTTxK79h9TSvlCg",
    authDomain: "sidcart-e1082.firebaseapp.com",
    projectId: "sidcart-e1082",
    storageBucket: "sidcart-e1082.firebasestorage.app",
    messagingSenderId: "523171688101",
    appId: "1:523171688101:web:1b93197136b381329aa74c"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uid = sessionStorage.getItem("uid");
if (!uid) { window.location.href = "login.html"; }

async function loadOrders() {
    const container = document.getElementById("orders-container");
    try {
        const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", uid)));
        const orders = [];
        snap.forEach(d => orders.push({ id: d.id, ...d.data() }));

        // Sort by date desc
        orders.sort((a, b) => {
            const da = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate);
            const db2 = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate);
            return db2 - da;
        });

        document.getElementById("orders-subtitle").textContent = orders.length + " order" + (orders.length !== 1 ? "s" : "") + " placed";

        if (orders.length === 0) {
            container.innerHTML = `<div class="empty">
                <span class="icon">📦</span>
                <h2>No orders yet</h2>
                <p>You haven't placed any orders. Start shopping!</p>
                <a href="shop.html">Shop Now</a>
            </div>`;
            return;
        }

        container.innerHTML = orders.map((order, idx) => {
            const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date(order.orderDate);
            const dateStr = date.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
            const timeStr = date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
            const items = order.items || [];
            return `<div class="order-card">
                <div class="order-header">
                    <div>
                        <div style="font-weight:700;font-size:15px;">Order #${order.id.slice(-8).toUpperCase()}</div>
                        <div class="order-date">${dateStr} at ${timeStr}</div>
                    </div>
                  <span class="payment-badge ${
    order.paymentMethod === "cash" ? "badge-cash" : 
    order.paymentMethod === "upi" ? "badge-upi" : "badge-credit"}">
    ${order.paymentMethod === "cash" ? "💵 Cash" : 
      order.paymentMethod === "upi" ? "📱 UPI" : "💳 Credit"}
</span>
                </div>
                <div class="order-items">
                    ${items.map(item => `<div class="order-item">
                        <img src="${item.image || 'https://via.placeholder.com/56?text=?'}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/56?text=?'">
                        <div class="order-item-info">
                            <div class="title">${item.title}</div>
                            <div class="meta">${item.brand || ""} · Qty: ${item.qty}</div>
                        </div>
                        <div class="order-item-price">₹${(item.price * item.qty).toLocaleString("en-IN")}</div>
                    </div>`).join("")}
                </div>
                <div class="order-footer">
                    <div class="order-total">Total: ₹${Number(order.totalAmount).toLocaleString("en-IN")}</div>
                    <span class="order-status">✅ Delivered</span>
                </div>
            </div>`;
        }).join("");

    } catch (e) {
        container.innerHTML = `<p style="color:red;text-align:center;padding:40px;">Error: ${e.message}</p>`;
        console.error(e);
    }
}

loadOrders();
