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
                status.textContent = "Please fill all fields.";
                status.style.color = "red";
                return;
            }

            status.textContent = "Verifying...";
            status.style.color = "#666";

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const userDoc = await getDoc(doc(db, "users", user.uid));

                if (userDoc.exists() && userDoc.data().role === "admin") {
                    sessionStorage.setItem("adminUID", user.uid);
                    sessionStorage.setItem("adminEmail", user.email);
                    status.textContent = "Access granted! Redirecting...";
                    status.style.color = "green";
                    setTimeout(() => window.location.href = "admin.html", 1000);
                } else {
                    await auth.signOut();
                    status.textContent = "❌ Access denied. Not an admin account.";
                    status.style.color = "red";
                }
            } catch (error) {
                status.textContent = "❌ " + error.message;
                status.style.color = "red";
            }
        });
