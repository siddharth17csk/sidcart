
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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

const uid      = sessionStorage.getItem("uid");
const userName = sessionStorage.getItem("userName");

if (uid) {
    document.getElementById("user-greeting").textContent = "Hi, " + userName + "! 👋";
    document.getElementById("orders-btn").style.display = "block";
    document.getElementById("logout-btn").style.display = "block";
} else {
    document.getElementById("login-btn").style.display  = "block";
    document.getElementById("signup-btn").style.display = "block";
}
document.getElementById("login-btn").onclick  = () => window.location.href = "login.html";
document.getElementById("signup-btn").onclick = () => window.location.href = "signup.html";
document.getElementById("orders-btn").onclick = () => window.location.href = "orders.html";
document.getElementById("logout-btn").onclick = () => { sessionStorage.clear(); window.location.reload(); };
document.getElementById("cart-btn").onclick   = () => { if (!uid) { showToast("Please login to view cart","error"); return; } window.location.href = "cart.html"; };

let cart = JSON.parse(localStorage.getItem("cart_" + (uid||"guest")) || "[]");
function updateCartCount() { document.getElementById("cart-count").textContent = cart.reduce((s,i)=>s+i.qty,0); }
updateCartCount();

function showToast(msg, type="success") {
    const t = document.getElementById("toast");
    t.textContent = (type==="success"?"✅ ":"❌ ") + msg;
    t.className = "toast " + type + " show";
    setTimeout(() => t.className = "toast", 2800);
}

let allProducts  = [];
let activeCat    = "All";
let activeGender = "All";

async function loadCategories() {
    const snap = await getDocs(collection(db,"Categories"));
    const bar  = document.getElementById("categories-bar");
    snap.forEach(d => {
        const name = d.data().Category;
        const btn  = document.createElement("button");
        btn.className = "cat-chip"; btn.dataset.cat = name; btn.textContent = name;
        btn.onclick = () => { document.querySelectorAll(".cat-chip").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); activeCat = name; applyFilters(); };
        bar.appendChild(btn);
    });
}

async function loadProducts() {
    const snap  = await getDocs(query(collection(db,"products"), where("active","!=",false)));
    allProducts = [];
    const brands = new Set();
    snap.forEach(d => { const p={id:d.id,...d.data()}; allProducts.push(p); if(p.brand) brands.add(p.brand); });
    const snap2 = await getDocs(collection(db,"products"));
    snap2.forEach(d => { const p=d.data(); if(p.active===undefined && !allProducts.find(x=>x.id===d.id)) { allProducts.push({id:d.id,...p}); if(p.brand) brands.add(p.brand); } });

    const brandList = document.getElementById("brand-list");
    brandList.innerHTML = "";
    [...brands].sort().forEach(brand => {
        brandList.innerHTML += `<label class="filter-option"><input type="checkbox" class="brand-check" value="${brand}"><label>${brand}</label></label>`;
    });
    document.querySelectorAll(".brand-check").forEach(cb => cb.onchange = applyFilters);
    applyFilters();
}

function applyFilters() {
    let result = [...allProducts];
    if (activeCat    !== "All") result = result.filter(p => p.category === activeCat);
    if (activeGender !== "All") result = result.filter(p => (p.gender||"").toLowerCase() === activeGender.toLowerCase());
    const search = document.getElementById("search-input").value.toLowerCase().trim();
    if (search) result = result.filter(p => p.title?.toLowerCase().includes(search) || p.brand?.toLowerCase().includes(search) || p.category?.toLowerCase().includes(search));
    const minP = Number(document.getElementById("price-min").value);
    const maxP = Number(document.getElementById("price-max").value);
    if (minP) result = result.filter(p => p.price >= minP);
    if (maxP) result = result.filter(p => p.price <= maxP);
    if (document.getElementById("filter-instock").checked) result = result.filter(p => p.qty > 0);
    const checkedBrands = [...document.querySelectorAll(".brand-check:checked")].map(c=>c.value);
    if (checkedBrands.length > 0) result = result.filter(p => checkedBrands.includes(p.brand));
    const sort = document.getElementById("sort-select").value;
    if (sort==="price-asc")  result.sort((a,b)=>a.price-b.price);
    else if (sort==="price-desc") result.sort((a,b)=>b.price-a.price);
    else if (sort==="name-asc")   result.sort((a,b)=>a.title?.localeCompare(b.title));
    else if (sort==="qty-desc")   result.sort((a,b)=>b.qty-a.qty);

    document.getElementById("product-count").textContent = result.length + " products found";
    renderTags();
    renderProducts(result);
}

function renderTags() {
    const wrap = document.getElementById("active-filters");
    const tags = [];
    if (activeCat !== "All")    tags.push({ label:"📂 "+activeCat,    clear:()=>{ activeCat="All"; document.querySelectorAll(".cat-chip").forEach(b=>b.classList.remove("active")); document.querySelector('.cat-chip[data-cat="All"]').classList.add("active"); applyFilters(); }});
    if (activeGender !== "All") tags.push({ label:"👤 "+activeGender, clear:()=>{ activeGender="All"; document.querySelectorAll(".gender-pill").forEach(p=>p.classList.remove("active")); document.querySelector('.gender-pill[data-gender="All"]').classList.add("active"); applyFilters(); }});
    const minP=document.getElementById("price-min").value, maxP=document.getElementById("price-max").value;
    if (minP||maxP) tags.push({ label:"₹"+(minP||"0")+"–"+(maxP||"∞"), clear:()=>{ document.getElementById("price-min").value=""; document.getElementById("price-max").value=""; applyFilters(); }});
    wrap.innerHTML = tags.map((t,i)=>`<span class="filter-tag">${t.label} <span onclick="clearTag(${i})">✕</span></span>`).join("");
    window._tagFns = tags.map(t=>t.clear);
}
window.clearTag = i => window._tagFns[i]();

function renderProducts(products) {
    const grid = document.getElementById("product-grid");
    if (!products.length) { grid.innerHTML=`<div class="empty" style="grid-column:1/-1;"><div class="icon">🔍</div><h3>No products found</h3><p>Try adjusting your filters</p></div>`; return; }
    grid.innerHTML = products.map(p => {
        const gc = (p.gender||"").toLowerCase();
        const gb = p.gender ? `<span class="gender-badge ${gc}">${p.gender}</span>` : "";
        return `<div class="product-card">
            <div class="img-wrap">
                <img src="${p.image||'https://via.placeholder.com/200x180?text=No+Image'}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/200x180?text=No+Image'">
                ${gb}
                ${p.qty<15&&p.qty>0?`<span class="badge-low-stock">Only ${p.qty} left!</span>`:""}
                ${p.qty===0?`<span class="badge-low-stock" style="background:#f8d7da;color:#721c24;">Out of Stock</span>`:""}
            </div>
            <div class="body">
                <div class="brand">${p.brand||""}</div>
                <div class="title">${p.title}</div>
                <div class="category-tag">${p.category||""}</div>
                <div class="price">₹${Number(p.price).toLocaleString("en-IN")}</div>
                ${p.qty>0?`<div class="qty-row"><label>Qty:</label><input type="number" class="qty-input" id="qty-${p.id}" min="1" max="${p.qty}" value="1"></div><button class="add-cart-btn" onclick="addToCart('${p.id}')">🛒 Add to Cart</button>`:`<button class="add-cart-btn" disabled>Out of Stock</button>`}
            </div>
        </div>`;
    }).join("");
}

window.addToCart = function(productId) {
    if (!uid) { showToast("Please login to add items to cart","error"); setTimeout(()=>window.location.href="login.html",1500); return; }
    const product = allProducts.find(p=>p.id===productId);
    if (!product) return;
    const qty = parseInt(document.getElementById("qty-"+productId)?.value||1);
    if (qty<1||qty>product.qty) { showToast("Invalid quantity","error"); return; }
    const cartKey = "cart_"+uid;
    cart = JSON.parse(localStorage.getItem(cartKey)||"[]");
    const existing = cart.find(i=>i.id===productId);
    if (existing) existing.qty = Math.min(existing.qty+qty, product.qty);
    else cart.push({id:productId, title:product.title, price:product.price, qty, image:product.image, brand:product.brand, category:product.category, maxQty:product.qty});
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();
    showToast(product.title+" added to cart!","success");
};

document.querySelectorAll(".gender-pill").forEach(pill => {
    pill.addEventListener("click", () => {
        document.querySelectorAll(".gender-pill").forEach(p=>p.classList.remove("active"));
        pill.classList.add("active");
        activeGender = pill.dataset.gender;
        applyFilters();
    });
});

document.getElementById("clear-filters").addEventListener("click", () => {
    activeCat="All"; activeGender="All";
    document.querySelectorAll(".cat-chip").forEach(b=>b.classList.remove("active"));
    document.querySelector('.cat-chip[data-cat="All"]').classList.add("active");
    document.querySelectorAll(".gender-pill").forEach(p=>p.classList.remove("active"));
    document.querySelector('.gender-pill[data-gender="All"]').classList.add("active");
    document.getElementById("price-min").value=""; document.getElementById("price-max").value="";
    document.getElementById("filter-instock").checked=false;
    document.getElementById("sort-select").value="";
    document.querySelectorAll(".brand-check").forEach(c=>c.checked=false);
    document.getElementById("search-input").value="";
    applyFilters();
});

document.getElementById("search-input").oninput  = applyFilters;
document.getElementById("sort-select").onchange  = applyFilters;
document.getElementById("apply-price").onclick   = applyFilters;
document.getElementById("filter-instock").onchange = applyFilters;

loadCategories();
loadProducts();
