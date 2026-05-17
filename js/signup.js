        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
        import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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

        document.getElementById("signup-btn").addEventListener("click", async () => {
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirm = document.getElementById("confirm-password").value;
            const mobile = document.getElementById("mobile").value.trim();
            const status = document.getElementById("status");

            if (!name || !email || !password || !mobile) {
                status.textContent = "Please fill all fields."; status.style.color = "red"; return;
            }
            if (password !== confirm) {
                status.textContent = "❌ Passwords do not match."; status.style.color = "red"; return;
            }
            if (password.length < 6) {
                status.textContent = "❌ Password must be at least 6 characters."; status.style.color = "red"; return;
            }
            if (!/^\d{10}$/.test(mobile)) {
                status.textContent = "❌ Enter a valid 10-digit mobile number."; status.style.color = "red"; return;
            }

            status.textContent = "Creating account..."; status.style.color = "#666";
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", cred.user.uid), {
                    id: cred.user.uid, name, email, mobile,
                    role: "customer", creditLimit: 1000, createdAt: new Date()
                });
                status.textContent = "✅ Account created! Redirecting to login..."; status.style.color = "green";
                setTimeout(() => window.location.href = "login.html", 1500);
            } catch (e) {
                status.textContent = "❌ " + e.message; status.style.color = "red";
            }
        });
