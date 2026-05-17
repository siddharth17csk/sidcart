        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
        import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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

        document.getElementById("login-btn").addEventListener("click", async () => {
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const status = document.getElementById("status");

            if (!email || !password) {
                status.textContent = "Please fill all fields."; status.style.color = "red"; return;
            }
            status.textContent = "Signing in..."; status.style.color = "#666";
            try {
                const cred = await signInWithEmailAndPassword(auth, email, password);
                const userDoc = await getDoc(doc(db, "users", cred.user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role === "admin") {
                        status.textContent = "❌ Use Admin login instead."; status.style.color = "red";
                        await auth.signOut(); return;
                    }
                    sessionStorage.setItem("uid", cred.user.uid);
                    sessionStorage.setItem("userName", data.name);
                    sessionStorage.setItem("userEmail", data.email);
                    sessionStorage.setItem("creditLimit", data.creditLimit ?? 1000);
                    status.textContent = "✅ Welcome back, " + data.name + "!"; status.style.color = "green";
                    setTimeout(() => window.location.href = "shop.html", 1000);
                } else {
                    status.textContent = "User profile not found."; status.style.color = "red";
                }
            } catch (e) {
                status.textContent = "❌ " + e.message; status.style.color = "red";
            }
        });
