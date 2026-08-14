const API_URL = "http://127.0.0.1:8000/api";
let currentGrades = {};

document.addEventListener("DOMContentLoaded", () => {
    fetchCourses();
});

async function fetchCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const courses = await response.json();
        
        const sem1Container = document.getElementById("sem1-container");
        const sem2Container = document.getElementById("sem2-container");
        
        sem1Container.innerHTML = "";
        sem2Container.innerHTML = "";
        
        courses.forEach(course => {
            const multiplier = parseFloat(course.difficulty_multiplier) || 0;
            const card = document.createElement("div");
            card.className = "course-card";
            
            card.innerHTML = `
                <h3>${course.title}</h3>
                <div class="course-meta">
                    <div class="meta-item">Δυσκολία: <span class="meta-value">x${multiplier}</span></div>
                    <div class="meta-item">XP: <span class="xp-highlight" id="xp-${course.id}">+0 XP</span></div>
                </div>
                <input type="number" min="0" max="10" step="0.5" 
                       class="grade-input" id="input-${course.id}" placeholder="Βαθμός" 
                       oninput="handleGradeInput(this.value, ${multiplier}, ${course.id})">
            `;
            
            if (course.semester === 1) {
                sem1Container.appendChild(card);
            } else {
                sem2Container.appendChild(card);
            }
        });

        await loadSavedGrades();

    } catch (error) {
        console.error("Σφάλμα κατά τη φόρτωση των μαθημάτων:", error);
    }
}

async function handleGradeInput(gradeStr, multiplier, courseId) {
    let grade = parseFloat(gradeStr);
    const xpSpan = document.getElementById(`xp-${courseId}`);
    
    if (grade > 10) {
        grade = 10;
        document.getElementById(`input-${courseId}`).value = 10;
    }

    if (isNaN(grade) || grade < 5) {
        xpSpan.innerText = "+0 XP";
        xpSpan.style.color = "#ef4444";
        delete currentGrades[courseId];
    } else {
        const earnedXP = Math.floor(grade * 6 * multiplier * 100);
        xpSpan.innerText = `+${earnedXP} XP`;
        xpSpan.style.color = "#10b981";
        currentGrades[courseId] = grade;
    }
    
    updateDashboardStats();

    if (grade >= 0 && grade <= 10) {
        const userData = localStorage.getItem("studyarc_user");
        if (userData) {
            const user = JSON.parse(userData);
            const gradeToSend = isNaN(grade) ? 0.0 : grade;
            
            try {
                const response = await fetch(`${API_URL}/save-grade`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: user.id,
                        course_id: courseId,
                        grade: gradeToSend
                    })
                });
                
                const data = await response.json();
                if (response.ok) {
                    document.getElementById("xp-counter").innerText = data.total_xp;
                    user.total_xp = data.total_xp;
                    localStorage.setItem("studyarc_user", JSON.stringify(user));
                    
                    // Χρήση του έξυπνου Toast notification αντί για alert!
                    showToast("Ο βαθμός αποθηκεύτηκε επιτυχώς!", "success");
                }
            } catch (e) {
                console.error("Αποτυχία σύνδεσης με το API αποθήκευσης:", e);
                showToast("Σφάλμα σύνδεσης. Ο βαθμός δεν αποθηκεύτηκε.", "error");
            }
        }
    }
}

async function loadSavedGrades() {
    const userData = localStorage.getItem("studyarc_user");
    if (!userData) return;
    
    const user = JSON.parse(userData);
    
    try {
        const response = await fetch(`${API_URL}/get-user-grades/${user.id}`);
        const savedGrades = await response.json();
        
        savedGrades.forEach(item => {
            if (item.grade > 0) {
                const inputField = document.getElementById(`input-${item.course_id}`);
                if (inputField) inputField.value = item.grade;
                
                const xpSpan = document.getElementById(`xp-${item.course_id}`);
                if (xpSpan) {
                    if (item.grade >= 5) {
                        xpSpan.innerText = `+${item.earned_xp} XP`;
                        xpSpan.style.color = "#10b981";
                        currentGrades[item.course_id] = item.grade;
                    } else {
                        xpSpan.innerText = "+0 XP";
                        xpSpan.style.color = "#ef4444";
                    }
                }
            }
        });
        
        updateDashboardStats();
        
    } catch (error) {
        console.error("Αποτυχία ανάκτησης αποθηκευμένων βαθμών:", error);
    }
}

function updateDashboardStats() {
    const passedCount = Object.keys(currentGrades).length;
    let sum = 0;
    
    for (let id in currentGrades) {
        sum += currentGrades[id];
    }
    
    const avg = passedCount > 0 ? (sum / passedCount).toFixed(2) : "0.0";
    
    document.getElementById("avg-grade").innerText = avg;
    document.getElementById("passed-courses").innerText = `${passedCount} / 10`;
}