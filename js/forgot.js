        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
        import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
        const app = initializeApp({
            apiKey:"AIzaSyBIKDCZ1sHZb1H94slOhTTxK79h9TSvlCg",
            authDomain:"sidcart-e1082.firebaseapp.com",
            projectId:"sidcart-e1082",
            storageBucket:"sidcart-e1082.firebasestorage.app",
            messagingSenderId:"523171688101",
            appId:"1:523171688101:web:1b93197136b381329aa74c"
        });
        const auth = getAuth(app);
        document.getElementById("reset-btn").addEventListener("click", async () => {
            const email = document.getElementById("email").value.trim();
            const status = document.getElementById("status");
            if (!email) { status.textContent = "Enter your email."; status.style.color = "red"; return; }
            try {
                await sendPasswordResetEmail(auth, email);
                status.textContent = "✅ Reset link sent! Check your inbox.";
                status.style.color = "green";
            } catch (e) {
                status.textContent = "❌ " + e.message; status.style.color = "red";
            }
        });
