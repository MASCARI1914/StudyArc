const API_URL_LAYOUT = "http://127.0.0.1:8000/api";

document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem("studyarc_user");
    if (!userData) {
        window.location.href = "index.html";
        return;
    }

    const user = JSON.parse(userData);
    document.getElementById("display-username").innerText = user.username;
    document.getElementById("xp-counter").innerText = user.total_xp;
});

// Εναλλαγή μεταξύ των κεντρικών Views (Tabs)
async function switchView(viewName) {
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    document.querySelectorAll('.menu-list a').forEach(link => {
        link.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.style.display = 'block';
    }
    
    const titles = {
        'stats': 'Σύνοψη Επιδόσεων',
        'courses-sem1': 'Μαθήματα Α\' Εξαμήνου',
        'courses-sem2': 'Μαθήματα Β\' Εξαμήνου',
        'rewards': 'Ανταμοιβές & Δώρα',
        'leaderboard': '🏆 Πίνακας Κατάταξης',
        'settings': 'Ρυθμίσεις Προφίλ',
        'contact': 'Επικοινωνία'
    };
    document.getElementById("view-title").innerText = titles[viewName] || 'Dashboard';

    const activeLink = document.getElementById(`nav-${viewName}`);
    if (activeLink) activeLink.classList.add('active');

    if (viewName === 'leaderboard') {
        await fetchLeaderboard();
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL_LAYOUT}/leaderboard`);
        const data = await response.json();
        const tbody = document.getElementById("leaderboard-body");
        tbody.innerHTML = "";

        data.forEach((user, index) => {
            const row = document.createElement("tr");
            let medal = index + 1;
            if (index === 0) medal = "🥇";
            if (index === 1) medal = "🥈";
            if (index === 2) medal = "🥉";

            row.innerHTML = `
                <td><span class="rank-badge">${medal}</span></td>
                <td class="student-name">${user.username}</td>
                <td class="xp-value">${user.total_xp} XP</td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error("Αποτυχία φόρτωσης leaderboard:", e);
        showToast("Πρόβλημα κατά τη φόρτωση της κατάταξης.", "error");
    }
}

function openLogoutModal() {
    document.getElementById("logout-modal").style.display = "flex";
}

function closeLogoutModal() {
    document.getElementById("logout-modal").style.display = "none";
}

function confirmLogout() {
    localStorage.removeItem("studyarc_user");
    window.location.href = "index.html";
}

// Λογική για Settings & Contact με χρήση Toasts αντί για Alerts
function updatePassword() {
    const passwordInput = document.getElementById("new-password");
    if(passwordInput.value.trim() === "") {
        showToast("Παρακαλώ πληκτρολόγησε έναν έγκυρο κωδικό!", "error");
        return;
    }
    passwordInput.value = "";
    showToast("Ο κωδικός πρόσβασης άλλαξε επιτυχώς!", "success");
}

function sendMessage() {
    const msgInput = document.getElementById("contact-message");
    if (msgInput.value.trim() === "") {
        showToast("Το μήνυμα δεν μπορεί να είναι κενό!", "error");
        return;
    }
    msgInput.value = "";
    showToast("Το μήνυμά σου στάλθηκε στην υποστήριξη!", "success");
}

// ΚΑΘΟΛΙΚΗ ΣΥΝΑΡΤΗΣΗ ΓΙΑ TOAST NOTIFICATIONS
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    
    // Δημιουργία του toast στοιχείου
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Προσθήκη εικονιδίου ανάλογα με τον τύπο
    const icon = type === "success" ? "✅" : "❌";
    toast.innerHTML = `<span>${icon} ${message}</span>`;
    
    container.appendChild(toast);
    
    // Εξαφάνιση με fade-out μετά από 3 δευτερόλεπτα
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s ease-forward";
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}