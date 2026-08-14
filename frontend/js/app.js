const API_URL = "http://127.0.0.1:8000/api";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Έλεγχος Ταυτοποίησης (Αν δεν έχει κάνει login, τον πετάμε στο index.html)
    const userData = localStorage.getItem("studyarc_user");
    if (!userData) {
        window.location.href = "index.html";
        return;
    }

    const user = JSON.parse(userData);
    
    // 2. Αν υπάρχει το Προφίλ στη σελίδα (π.χ. στο dashboard), το γεμίζουμε
    const displayUsername = document.getElementById("display-username");
    if (displayUsername) {
        displayUsername.innerText = user.username;
        document.getElementById("xp-counter").innerText = user.total_xp;
    }

    // 3. Αν υπάρχει το container μαθημάτων (άρα είμαστε στο dashboard), τα φορτώνουμε
    const coursesContainer = document.getElementById("courses-container");
    if (coursesContainer) {
        fetchCourses();
    }
});

function logout() {
    localStorage.removeItem("studyarc_user");
    window.location.href = "index.html";
}

async function fetchCourses() {
    const response = await fetch(`${API_URL}/courses`);
    const courses = await response.json();
    const container = document.getElementById("courses-container");
    
    courses.forEach(course => {
        const card = document.createElement("div");
        card.className = "course-card";
        card.innerHTML = `
            <div class="course-info">
                <h3>${course.title}</h3>
                <p>Δυσκολία: x${course.multiplier}</p>
                <span class="xp-reward" id="xp-${course.id}">+0 XP</span>
            </div>
            <div>
                <input type="number" min="0" max="10" step="0.5" 
                       class="grade-input" placeholder="Βαθμός" 
                       oninput="calculateCardXP(this.value, ${course.multiplier}, ${course.id})">
            </div>
        `;
        container.appendChild(card);
    });
}

function calculateCardXP(grade, multiplier, courseId) {
    const xpSpan = document.getElementById(`xp-${courseId}`);
    if (!grade || grade < 5) {
        xpSpan.innerText = "+0 XP";
        xpSpan.style.color = "#ef4444";
        return;
    }
    const earnedXP = Math.floor(grade * 6 * multiplier * 100);
    xpSpan.innerText = `+${earnedXP} XP`;
    xpSpan.style.color = "#10b981";
}

// --- Λογική για Ρυθμίσεις (Mockups) ---
function updatePassword() {
    alert("Η αλλαγή κωδικού θα συνδεθεί με το Backend σύντομα!");
}

function deleteAccount() {
    if(confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις τα δεδομένα σου;")) {
        alert("Ο λογαριασμός θα διαγραφεί μέσω της βάσης δεδομένων.");
    }
}

// --- Λογική για Επικοινωνία (Mockup) ---
function sendMessage() {
    const msg = document.getElementById("contact-message").value;
    if (msg.trim() === "") return;
    
    document.getElementById("contact-message").value = "";
    document.getElementById("contact-feedback").style.display = "block";
    setTimeout(() => {
        document.getElementById("contact-feedback").style.display = "none";
    }, 3000);
}