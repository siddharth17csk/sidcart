
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, getDocs, doc,
    updateDoc, deleteDoc, query, where, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIKDCZ1sHZb1H94slOhTTxK79h9TSvlCg",
    authDomain: "sidcart-e1082.firebaseapp.com",
    projectId: "sidcart-e1082",
    storageBucket: "sidcart-e1082.firebasestorage.app",
    messagingSenderId: "523171688101",
    appId: "1:523171688101:web:1b93197136b381329aa74c"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Guard
if (!sessionStorage.getItem("adminUID")) {
    window.location.href = "admin-login.html";
}

// ─── NAVIGATION ───────────────────────────────
document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        item.classList.add("active");
        const sec = item.dataset.section;
        document.getElementById("section-" + sec).classList.add("active");
        if (sec === "inventory") loadInventory();
        if (sec === "categories") loadCategories();
        if (sec === "customers") loadCustomers();
        if (sec === "dashboard") loadDashboard();
        if (sec === "reports") loadInventoryReport();
    });
});

document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    sessionStorage.clear();
    window.location.href = "index.html";
});

// ─── DASHBOARD ────────────────────────────────
async function loadDashboard() {
    const [prods, cats, custs, orders, sales] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "Categories")),
        getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "sales"))
    ]);
    document.getElementById("stat-products").textContent = prods.size;
    document.getElementById("stat-categories").textContent = cats.size;
    document.getElementById("stat-customers").textContent = custs.size;
    document.getElementById("stat-orders").textContent = orders.size;
    let lowStock = 0;
    prods.forEach(d => { if (d.data().qty < 15) lowStock++; });
    document.getElementById("stat-lowstock").textContent = lowStock;
    let revenue = 0;
    sales.forEach(d => { revenue += d.data().totalAmount || 0; });
    document.getElementById("stat-revenue").textContent = "₹" + revenue.toLocaleString("en-IN");
}

// ─── CATEGORIES ───────────────────────────────
let allCategories = [];

async function loadCategories() {
    const snap = await getDocs(collection(db, "Categories"));
    allCategories = [];
    snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));
    renderCategories();
    populateCategoryDropdowns();
}

function renderCategories() {
    const tbody = document.getElementById("categories-tbody");
    tbody.innerHTML = "";
    allCategories.forEach((cat, i) => {
        tbody.innerHTML += `<tr>
            <td>${i + 1}</td>
            <td>${cat.Category || cat.name || ""}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-red" onclick="deleteCat('${cat.id}')">🗑️ Delete</button>
                </div>
            </td>
        </tr>`;
    });
}

function populateCategoryDropdowns() {
    const selects = ["p-category", "edit-category", "inv-filter-cat", "r-inv-cat-filter"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id.includes("filter") || id.includes("r-inv");
        el.innerHTML = isFilter ? '<option value="">All Categories</option>' : '<option value="">Select category</option>';
        allCategories.forEach(cat => {
            const name = cat.Category || cat.name || "";
            el.innerHTML += `<option value="${name}">${name}</option>`;
        });
    });
}

document.getElementById("add-cat-btn").addEventListener("click", async () => {
    const name = document.getElementById("cat-name").value.trim();
    const status = document.getElementById("cat-status");
    if (!name) { status.textContent = "Enter a name."; status.style.color = "red"; return; }
    try {
        await addDoc(collection(db, "Categories"), { Category: name });
        status.textContent = "Category added!"; status.style.color = "green";
        document.getElementById("cat-name").value = "";
        loadCategories();
    } catch (e) { status.textContent = e.message; status.style.color = "red"; }
});

window.deleteCat = async function(id) {
    if (!confirm("Delete this category?")) return;
    await deleteDoc(doc(db, "Categories", id));
    loadCategories();
};

// ─── INVENTORY ────────────────────────────────
let allProducts = [];
const PAGE_SIZE = 10;
let currentPage = 1;

async function loadInventory() {
    if (allCategories.length === 0) await loadCategories();
    const snap = await getDocs(collection(db, "products"));
    allProducts = [];
    snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));
    applyFilters();
}

function applyFilters() {
    const search = document.getElementById("inv-search").value.toLowerCase();
    const cat = document.getElementById("inv-filter-cat").value;
    const stock = document.getElementById("inv-filter-stock").value;
    let filtered = allProducts.filter(p => {
        const matchSearch = p.title?.toLowerCase().includes(search) || p.brand?.toLowerCase().includes(search);
        const matchCat = !cat || p.category === cat;
        const matchStock = !stock || (stock === "high" ? p.qty > 100 : p.qty < 15);
        return matchSearch && matchCat && matchStock;
    });
    currentPage = 1;
    renderInventory(filtered);
}

["inv-search", "inv-filter-cat", "inv-filter-stock"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", applyFilters);
    document.getElementById(id)?.addEventListener("change", applyFilters);
});

function renderInventory(products) {
    const tbody = document.getElementById("inventory-tbody");
    const total = products.length;
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = products.slice(start, start + PAGE_SIZE);
    tbody.innerHTML = "";
    if (page.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#666;padding:40px;">No products found.</td></tr>`;
    } else {
        page.forEach(p => {
            const stockBadge = p.qty < 15 ? `<span class="badge badge-low">Low</span>` :
                p.active === false ? `<span class="badge badge-inactive">Inactive</span>` :
                `<span class="badge badge-active">Active</span>`;
            tbody.innerHTML += `<tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.image || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">
                        <div>
                            <div style="font-weight:600;">${p.title}</div>
                            <div style="font-size:12px;color:#666;">${p.brand}</div>
                        </div>
                    </div>
                </td>
                <td>${p.category}</td>
                <td>₹${p.price?.toLocaleString("en-IN")}</td>
                <td>${p.qty}</td>
                <td>${stockBadge}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-blue" onclick="openEditModal('${p.id}')">✏️ Edit</button>
                        <button class="btn" style="background:#f0f5ff;color:#4f46e5;border:1px solid #c7d2fe;"
                            onclick="toggleActive('${p.id}', ${p.active !== false})">${p.active === false ? '✅ Activate' : '⛔ Deactivate'}</button>
                        <button class="btn btn-red" onclick="confirmDelete('${p.id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
        });
    }
    renderPagination(total, products);
}

function renderPagination(total, products) {
    const pages = Math.ceil(total / PAGE_SIZE);
    const container = document.getElementById("inv-pagination");
    container.innerHTML = "";
    for (let i = 1; i <= pages; i++) {
        const btn = document.createElement("button");
        btn.className = "page-btn" + (i === currentPage ? " active" : "");
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderInventory(products); };
        container.appendChild(btn);
    }
}

// ADD PRODUCT
document.getElementById("add-product-btn").addEventListener("click", async () => {
    const title = document.getElementById("p-title").value.trim();
    const brand = document.getElementById("p-brand").value.trim();
    const category = document.getElementById("p-category").value;
    const subcategory = document.getElementById("p-subcategory").value.trim();
    const price = Number(document.getElementById("p-price").value);
    const qty = Number(document.getElementById("p-qty").value);
    const image = document.getElementById("p-image").value.trim();
    const description = document.getElementById("p-description").value.trim();
    const status = document.getElementById("product-status");

    if (!title || !brand || !category || !price || !qty) {
        status.textContent = "Fill all required fields."; status.style.color = "red"; return;
    }
    try {
        await addDoc(collection(db, "products"), {
            title, brand, category, subcategory, price, qty, image, description,
            active: true, createdAt: new Date()
        });
        status.textContent = "✅ Product added!"; status.style.color = "green";
        ["p-title","p-brand","p-subcategory","p-price","p-qty","p-image","p-description"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("p-category").value = "";
        loadInventory();
    } catch (e) { status.textContent = e.message; status.style.color = "red"; }
});

// TOGGLE ACTIVE
window.toggleActive = async function(id, isActive) {
    await updateDoc(doc(db, "products", id), { active: !isActive });
    loadInventory();
};

// DELETE
let pendingDeleteId = null;
window.confirmDelete = function(id) {
    pendingDeleteId = id;
    document.getElementById("confirm-dialog").classList.add("open");
};
document.getElementById("confirm-no").onclick = () => {
    document.getElementById("confirm-dialog").classList.remove("open");
    pendingDeleteId = null;
};
document.getElementById("confirm-yes").onclick = async () => {
    if (pendingDeleteId) {
        await deleteDoc(doc(db, "products", pendingDeleteId));
        document.getElementById("confirm-dialog").classList.remove("open");
        pendingDeleteId = null;
        loadInventory();
    }
};

// EDIT
window.openEditModal = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById("edit-product-id").value = id;
    document.getElementById("edit-title").value = p.title || "";
    document.getElementById("edit-brand").value = p.brand || "";
    document.getElementById("edit-subcategory").value = p.subcategory || "";
    document.getElementById("edit-price").value = p.price || "";
    document.getElementById("edit-qty").value = p.qty || "";
    document.getElementById("edit-image").value = p.image || "";
    document.getElementById("edit-description").value = p.description || "";
    // populate edit category
    const sel = document.getElementById("edit-category");
    sel.innerHTML = "";
    allCategories.forEach(cat => {
        const name = cat.Category || cat.name || "";
        const opt = document.createElement("option");
        opt.value = name; opt.textContent = name;
        if (name === p.category) opt.selected = true;
        sel.appendChild(opt);
    });
    document.getElementById("edit-modal").classList.add("open");
};
document.getElementById("cancel-edit-btn").onclick = () => document.getElementById("edit-modal").classList.remove("open");
document.getElementById("save-edit-btn").addEventListener("click", async () => {
    const id = document.getElementById("edit-product-id").value;
    const status = document.getElementById("edit-status");
    try {
        await updateDoc(doc(db, "products", id), {
            title: document.getElementById("edit-title").value.trim(),
            brand: document.getElementById("edit-brand").value.trim(),
            category: document.getElementById("edit-category").value,
            subcategory: document.getElementById("edit-subcategory").value.trim(),
            price: Number(document.getElementById("edit-price").value),
            qty: Number(document.getElementById("edit-qty").value),
            image: document.getElementById("edit-image").value.trim(),
            description: document.getElementById("edit-description").value.trim()
        });
        status.textContent = "✅ Updated!"; status.style.color = "green";
        setTimeout(() => { document.getElementById("edit-modal").classList.remove("open"); loadInventory(); }, 1000);
    } catch (e) { status.textContent = e.message; status.style.color = "red"; }
});

// ─── CUSTOMERS ────────────────────────────────
async function loadCustomers() {
    const snap = await getDocs(query(collection(db, "users"), where("role", "==", "Customer")));
    const customers = [];
    snap.forEach(d => customers.push({ id: d.id, ...d.data() }));
    renderCustomers(customers);

    document.getElementById("cust-search").oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = customers.filter(c =>
            c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
        renderCustomers(filtered);
    };
}

function renderCustomers(customers) {
    const tbody = document.getElementById("customers-tbody");
    tbody.innerHTML = "";
    customers.forEach(c => {
        tbody.innerHTML += `<tr>
            <td>${c.name}</td>
            <td>${c.email}</td>
            <td>${c.mobile}</td>
            <td>₹${c.creditLimit ?? 1000}</td>
            <td>
                <button class="btn btn-blue" onclick="openCreditModal('${c.id}','${c.name}',${c.creditLimit ?? 1000})">
                    💳 Edit Credit
                </button>
            </td>
        </tr>`;
    });
}

window.openCreditModal = function(uid, name, limit) {
    document.getElementById("credit-uid").value = uid;
    document.getElementById("credit-name").textContent = name;
    document.getElementById("credit-limit-input").value = limit;
    document.getElementById("credit-modal").classList.add("open");
};
document.getElementById("cancel-credit-btn").onclick = () => document.getElementById("credit-modal").classList.remove("open");
document.getElementById("save-credit-btn").addEventListener("click", async () => {
    const uid = document.getElementById("credit-uid").value;
    const limit = Number(document.getElementById("credit-limit-input").value);
    const status = document.getElementById("credit-status");
    try {
        await updateDoc(doc(db, "users", uid), { creditLimit: limit });
        status.textContent = "✅ Updated!"; status.style.color = "green";
        setTimeout(() => { document.getElementById("credit-modal").classList.remove("open"); loadCustomers(); }, 800);
    } catch (e) { status.textContent = e.message; status.style.color = "red"; }
});

// ─── REPORTS ──────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll("#tab-sales, #tab-inventory, #tab-customers-report").forEach(t => t.style.display = "none");
        document.getElementById("tab-" + btn.dataset.tab).style.display = "block";
        if (btn.dataset.tab === "inventory") loadInventoryReport();
    });
});

// Sales Report
document.getElementById("load-sales-btn").addEventListener("click", loadSalesReport);
async function loadSalesReport() {
    const from = document.getElementById("sales-from").value;
    const to = document.getElementById("sales-to").value;
    const snap = await getDocs(collection(db, "sales"));
    let salesData = [];
    snap.forEach(d => salesData.push(d.data()));

    if (from) salesData = salesData.filter(s => {
        const d = s.saleDate?.toDate ? s.saleDate.toDate() : new Date(s.saleDate);
        return d >= new Date(from);
    });
    if (to) salesData = salesData.filter(s => {
        const d = s.saleDate?.toDate ? s.saleDate.toDate() : new Date(s.saleDate);
        return d <= new Date(to + "T23:59:59");
    });

    const total = salesData.length;
    const revenue = salesData.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const cash = salesData.filter(d => d.paymentMethod === "cash").length;
    const credit = salesData.filter(d => d.paymentMethod === "credit").length;

    document.getElementById("r-total-sales").textContent = total;
    document.getElementById("r-revenue").textContent = "₹" + revenue.toLocaleString("en-IN");
    document.getElementById("r-cash").textContent = cash;
    document.getElementById("r-credit").textContent = credit;

    // Item aggregation
    const itemMap = {};
    salesData.forEach(sale => {
        (sale.items || []).forEach(item => {
            if (!itemMap[item.title]) itemMap[item.title] = { units: 0, revenue: 0 };
            itemMap[item.title].units += item.qty || 1;
            itemMap[item.title].revenue += (item.price || 0) * (item.qty || 1);
        });
    });
    const sorted = Object.entries(itemMap).sort((a, b) => b[1].units - a[1].units);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10).reverse();

    const renderItems = (items, tbodyId) => {
        const tbody = document.getElementById(tbodyId);
        tbody.innerHTML = items.map(([name, data], i) =>
            `<tr><td>${i+1}</td><td>${name}</td><td>${data.units}</td><td>₹${data.revenue.toLocaleString("en-IN")}</td></tr>`
        ).join("") || `<tr><td colspan="4" style="text-align:center;color:#666;padding:30px;">No data</td></tr>`;
    };
    renderItems(top10, "top-items-tbody");
    renderItems(bottom10, "bottom-items-tbody");
}

// Inventory Report
document.getElementById("r-inv-cat-filter").addEventListener("change", () => loadInventoryReport());
async function loadInventoryReport() {
    if (allProducts.length === 0) await loadInventory();
    const catFilter = document.getElementById("r-inv-cat-filter").value;
    let prods = allProducts;
    if (catFilter) prods = prods.filter(p => p.category === catFilter);

    document.getElementById("r-inv-total").textContent = prods.length;
    document.getElementById("r-inv-high").textContent = prods.filter(p => p.qty > 100).length;
    document.getElementById("r-inv-low").textContent = prods.filter(p => p.qty < 15).length;

    const tbody = document.getElementById("inv-report-tbody");
    tbody.innerHTML = prods.map(p => {
        const badge = p.qty > 100 ? `<span class="badge badge-active">High</span>` :
            p.qty < 15 ? `<span class="badge badge-low">Low</span>` :
            `<span class="badge" style="background:#f0f9ff;color:#0369a1;">Normal</span>`;
        return `<tr><td>${p.title}</td><td>${p.category}</td><td>${p.qty}</td><td>${badge}</td></tr>`;
    }).join("") || `<tr><td colspan="4" style="text-align:center;color:#666;padding:30px;">No data</td></tr>`;
}

// Customers Report
document.getElementById("load-cust-report-btn").addEventListener("click", async () => {
    const from = document.getElementById("cust-report-from").value;
    const to = document.getElementById("cust-report-to").value;
    const [ordersSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(query(collection(db, "users"), where("role", "==", "customer")))
    ]);
    const users = {};
    usersSnap.forEach(d => users[d.id] = d.data());
    const custMap = {};
    ordersSnap.forEach(d => {
        const order = d.data();
        let orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : new Date(order.orderDate);
        if (from && orderDate < new Date(from)) return;
        if (to && orderDate > new Date(to + "T23:59:59")) return;
        const uid = order.userId || "unknown";
        if (!custMap[uid]) custMap[uid] = { orders: 0, total: 0, payment: order.paymentMethod };
        custMap[uid].orders++;
        custMap[uid].total += order.totalAmount || 0;
    });
    const sorted = Object.entries(custMap).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    const tbody = document.getElementById("top-customers-tbody");
    tbody.innerHTML = sorted.map(([uid, data], i) => {
        const u = users[uid];
        return `<tr>
            <td>${i+1}</td>
            <td>${u ? u.name : uid}</td>
            <td>${data.orders}</td>
            <td>₹${data.total.toLocaleString("en-IN")}</td>
            <td>${data.payment}</td>
        </tr>`;
    }).join("") || `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px;">No data</td></tr>`;
});

// ─── INIT ─────────────────────────────────────
loadDashboard();
loadCategories();
