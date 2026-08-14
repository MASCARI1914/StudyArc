const API_URL = "http://127.0.0.1:8000/api";

// 1. Εναλλαγή μεταξύ των οθονών
function showView(viewId) {
    document.getElementById("selection-view").style.display = "none";
    document.getElementById("login-view").style.display = "none";
    document.getElementById("register-view").style.display = "none";
    
    document.getElementById(viewId).style.display = "block";
    document.getElementById("auth-message").innerText = ""; 
}

// 2. Εμφάνιση / Απόκρυψη Κωδικού (Το ματάκι)
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

// 3. Έλεγχος μορφής ΑΕΜ (Πρέπει να είναι ακριβώς 7 ψηφία και να ξεκινάει από 20)
function isValidAEM(username) {
    const aemRegex = /^20\d{5}$/; 
    return aemRegex.test(username);
}

// 4. Λειτουργία Εγγραφής
async function register() {
    const user = document.getElementById("register-username").value;
    const pass = document.getElementById("register-password").value;
    const msgBox = document.getElementById("auth-message");

    if (!isValidAEM(user)) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "Σφάλμα: Το ΑΕΜ πρέπει να είναι 7 ψηφία (π.χ. 2020122).";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();
        
        if (response.ok) {
            msgBox.style.color = "#10b981";
            msgBox.innerText = "Επιτυχής εγγραφή! Παρακαλώ κάνε Login.";
            document.getElementById("register-username").value = "";
            document.getElementById("register-password").value = "";
            setTimeout(() => showView("login-view"), 1500);
        } else {
            msgBox.style.color = "#ef4444";
            msgBox.innerText = data.detail; 
        }
    } catch (e) {
        msgBox.innerText = "Πρόβλημα σύνδεσης με τον server.";
    }
}

// 5. Λειτουργία Σύνδεσης
async function login() {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    const msgBox = document.getElementById("auth-message");

    if (!isValidAEM(user)) {
        msgBox.style.color = "#ef4444";
        msgBox.innerText = "Σφάλμα: Λάθος μορφή ΑΕΜ.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem("studyarc_user", JSON.stringify(data));
            window.location.href = "dashboard.html"; // Μεταφορά στην εφαρμογή
        } else {
            msgBox.style.color = "#ef4444";
            // Εδώ το Backend μας στέλνει 400 Bad Request και τυπώνουμε το "Λάθος ΑΕΜ ή Κωδικός"
            msgBox.innerText = data.detail;
        }
    } catch (e) {
        msgBox.innerText = "Πρόβλημα σύνδεσης με τον server.";
    }
}