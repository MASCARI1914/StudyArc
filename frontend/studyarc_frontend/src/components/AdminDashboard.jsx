import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

export default function AdminDashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [courses, setCourses] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState('students'); 
  const [activeSemesterTab, setActiveSemesterTab] = useState(1); 

  const [currentStudent, setCurrentStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [isAdminFirstAttempt, setIsAdminFirstAttempt] = useState(true);

  const [statsStudent, setStatsStudent] = useState(null);
  const [xpInput, setXpInput] = useState('');
  const [levelInput, setLevelInput] = useState('');
  const [tokensInput, setTokensInput] = useState('');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchData = async () => {
    try {
      const resStudents = await axios.get(`${API_URL}/admin/students`);
      const resRewards = await axios.get(`${API_URL}/admin/rewards`);
      
      if (resStudents.data.length > 0) {
        const resDashboard = await axios.get(`${API_URL}/dashboard/${resStudents.data[0].id}`);
        setCourses(resDashboard.data.courses || []);
      }

      setStudents(resStudents.data);
      setRewards(resRewards.data);
      setLoading(false);
    } catch (err) {
      console.error("Σφάλμα κατά τη φόρτωση δεδομένων Admin:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentStudent) {
      const updated = students.find(s => s.id === currentStudent.id);
      if (updated) setCurrentStudent(updated);
    }
  }, [students]);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const gradeFloat = parseFloat(gradeInput);
    if (isNaN(gradeFloat) || gradeFloat < 0 || gradeFloat > 10) {
      alert("Παρακαλώ εισάγετε έναν έγκυρο βαθμό από 0 έως 10.");
      return;
    }
    try {
      await axios.post(`${API_URL}/submit-grade`, {
        user_id: currentStudent.id,
        course_code: selectedCourse.course_code,
        grade: gradeFloat,
        is_first_attempt: isAdminFirstAttempt
      });
      setSelectedCourse(null);
      setGradeInput('');
      await fetchData(); 
      alert(`✨ Ο βαθμός και τα Tokens για το μάθημα "${selectedCourse.title}" καταχωρήθηκαν επιτυχώς!`);
    } catch (err) {
      alert("Αποτυχία καταχώρησης βαθμού.");
    }
  };

  const handleStatsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/admin/update-stats`, {
        user_id: statsStudent.id,
        total_xp: parseInt(xpInput),
        level: parseInt(levelInput),
        tokens: parseInt(tokensInput)
      });
      setStatsStudent(null);
      await fetchData();
      alert("⚙️ Τα στατιστικά του φοιτητή διορθώθηκαν επιτυχώς!");
    } catch (err) {
      alert("Αποτυχία ενημέρωσης στατιστικών.");
    }
  };

  const handleRewardAction = async (id, action) => {
    try {
      await axios.post(`${API_URL}/admin/rewards/action`, { reward_id: id, action });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openStudentProfile = (student) => {
    setCurrentStudent(student);
    setActiveSemesterTab(1); 
    setView('student_view'); 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-xl font-bold animate-pulse">Φόρτωση StudyArc Admin Panel...</p>
      </div>
    );
  }

  const filteredCourses = courses.filter(c => Number(c.semester) === activeSemesterTab);

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* SIDEBAR ADMIN */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col justify-between select-none">
        <div>
          <div className="flex items-center gap-2 mb-10">
             <img src="/StudyArc.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="text-2xl font-black text-purple-500 tracking-wider">
              StudyArc
              <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest mt-0.5">ADMIN PANEL</span>
            </span>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setView('students')}
              className={`w-full text-left p-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all flex items-center gap-2 ${view === 'students' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`}
            >
              👥 Λίστα Φοιτητών
            </button>
            
            {view === 'student_view' && currentStudent && (
              <button 
                onClick={() => setView('student_view')}
                className="w-full text-left p-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all bg-purple-500/10 text-purple-400 border-l-4 border-purple-500 flex items-center gap-2"
              >
                🎓 Καρτέλα: {currentStudent.username}
              </button>
            )}

            <button 
              onClick={() => setView('rewards')}
              className={`w-full text-left p-3 rounded-xl font-bold text-sm border-none cursor-pointer transition-all flex items-center justify-between ${view === 'rewards' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`}
            >
              <span className="flex items-center gap-2">🎁 Έλεγχος Δώρων</span>
              {rewards.filter(r => r.status === "Pending").length > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  {rewards.filter(r => r.status === "Pending").length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        <button 
          onClick={() => setShowLogoutConfirm(true)} 
          className="w-full p-3 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-500/20 rounded-xl font-bold text-sm border border-zinc-700 cursor-pointer transition-all"
        >
          🚪 Αποσύνδεση Admin
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-10 bg-zinc-900/20 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg select-none">
          <div>
            <h2 className="text-xl font-black">Διαχειριστής: <span className="text-purple-400">{user.username}</span></h2>
            <p className="text-xs text-zinc-500 mt-1">Live παράκαμψη βάσης, έλεγχος αλγορίθμου Tokens και εξαργυρώσεων.</p>
          </div>
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider">TOKEN APP v3.0</span>
        </header>

        {view === 'students' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-400 select-none">Εγγεγραμμένοι Φοιτητές</h3>
            <div className="grid grid-cols-1 gap-4">
              {students.map((s) => (
                <div key={s.id} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex justify-between items-center shadow-sm hover:border-zinc-700 transition-all">
                  <div>
                    <h4 className="text-lg font-black text-white tracking-wide">{s.username}</h4>
                    <div className="flex gap-5 mt-2 text-xs text-zinc-400 font-semibold select-none">
                      <span>Επίπεδο: <b className="text-purple-400">Lvl {s.level}</b></span>
                      <span>Συνολικά XP: <b className="text-emerald-400">{s.total_xp.toLocaleString()} XP</b></span>
                      <span>Arcade Coins: <b className="text-yellow-500">{s.tokens} 🪙</b></span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setStatsStudent(s);
                        setXpInput(s.total_xp);
                        setLevelInput(s.level);
                        setTokensInput(s.tokens);
                      }} 
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700 cursor-pointer shadow transition-colors"
                    >
                      ⚙️ Διόρθωση Coins / XP
                    </button>
                    <button 
                      onClick={() => openStudentProfile(s)} 
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer shadow-md transition-colors"
                    >
                      👁️ Άνοιγμα Καρτέλας Μαθημάτων
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'student_view' && currentStudent && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <button onClick={() => setView('students')} className="text-xs font-bold text-purple-400 bg-transparent border-none cursor-pointer hover:underline mb-2 block">← Επιστροφή στη λίστα</button>
                <h3 className="text-2xl font-black text-white tracking-wide">Ακαδημαϊκό Προφίλ: <span className="text-purple-400">{currentStudent.username}</span></h3>
              </div>
              
              <div className="flex gap-3 text-xs select-none">
                <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 text-center min-w-[80px]">
                  <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Level</p>
                  <p className="text-lg font-black text-purple-400 mt-0.5">{currentStudent.level}</p>
                </div>
                <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 text-center min-w-[100px]">
                  <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Arcade Coins</p>
                  <p className="text-lg font-black text-yellow-500 mt-0.5">{currentStudent.tokens} 🪙</p>
                </div>
              </div>
            </div>

            {/* ΦΙΛΤΡΑ ΕΞΑΜΗΝΩΝ 1 ΕΩΣ 9 */}
            <div className="flex flex-wrap gap-2 select-none">
              {[
                { sem: 1, label: "📘 Α'" },
                { sem: 2, label: "💡 Β'" },
                { sem: 3, label: "⚡ Γ'" },
                { sem: 4, label: "🔥 Δ'" },
                { sem: 5, label: "🚀 Ε'" },
                { sem: 6, label: "💻 ΣΤ'" },
                { sem: 7, label: "🌐 Ζ'" },
                { sem: 8, label: "🛡️ Η'" },
                { sem: 9, label: "🤖 Θ'" }
              ].map((tab) => (
                <button 
                  key={tab.sem}
                  onClick={() => setActiveSemesterTab(tab.sem)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${activeSemesterTab === tab.sem ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  {tab.label} Εξάμηνο
                </button>
              ))}
            </div>

            {/* ΠΛΕΓΜΑ ΜΑΘΗΜΑΤΩΝ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCourses.map((course) => {
                const courseData = currentStudent.grades[course.course_code];
                const hasGrade = courseData !== undefined;

                return (
                  <div key={course.course_code} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between shadow-sm hover:border-zinc-700 transition-all">
                    <div>
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">{course.course_code}</span>
                        <span className={`text-xs font-black px-3 py-1 rounded-md ${hasGrade && courseData.grade >= 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>
                          {hasGrade ? `Βαθμός: ${courseData.grade}` : 'Μη Καταχωρημένο'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-4">{course.title}</h4>
                      {hasGrade && (
                        <p className="text-[11px] text-zinc-500 font-semibold mt-1">
                          Κατάσταση: <span className="text-purple-400">{courseData.is_first_attempt ? '1η Προσπάθεια (Bonus 1.2x)' : 'Επανεξέταση'}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-5 pt-4 border-t border-zinc-800/60 flex justify-between items-center select-none">
                      <span className="text-xs font-bold text-zinc-400">{course.ects} ECTS (σ = {course.difficulty_multiplier})</span>
                      <button 
                        onClick={() => {
                          setSelectedCourse(course);
                          setGradeInput(hasGrade ? courseData.grade.toString() : '');
                          setIsAdminFirstAttempt(hasGrade ? courseData.is_first_attempt : true);
                        }} 
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl border-none cursor-pointer transition-colors shadow"
                      >
                        {hasGrade ? "📝 Αλλαγή Στοιχείων" : "➕ Καταχώρηση Βαθμού"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'rewards' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-400 select-none">Αιτήματα & Έλεγχος Κουπονιών</h3>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800 select-none">
                    <th className="p-4">Φοιτητής</th>
                    <th className="p-4">Δώρο / Ανταμοιβή</th>
                    <th className="p-4">Κόστος</th>
                    <th className="p-4">Κατάσταση</th>
                    <th className="p-4 text-right">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold divide-y divide-zinc-800/40">
                  {rewards.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-4 text-white font-bold">{r.username}</td>
                      <td className="p-4 text-purple-400 font-bold">{r.item_title}</td>
                      <td className="p-4 text-yellow-500 font-mono font-bold">{r.cost} 🪙</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs select-none font-bold ${r.status === "Approved" ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {r.status === "Approved" ? "Εγκρίθηκε" : "Εκκρεμεί"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 select-none">
                        {r.status === "Pending" && (
                          <button onClick={() => handleRewardAction(r.id, "approve")} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg border-none cursor-pointer shadow transition-colors">Έγκριση</button>
                        )}
                        <button onClick={() => handleRewardAction(r.id, "delete")} className="px-3 py-1.5 bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-400 text-xs font-bold rounded-lg border-none cursor-pointer shadow transition-colors">
                          {r.status === "Pending" ? "Απόρριψη (+Refund)" : "Διαγραφή"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rewards.length === 0 && (
                    <tr><td colSpan="5" className="p-6 text-center text-zinc-500 font-medium">Καμία αίτηση εξαργύρωσης προς το παρόν.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedCourse && currentStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-md relative shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-1 tracking-wide">Οριστικοποίηση Βαθμολογίας</h3>
              <p className="text-sm text-zinc-400 mb-6">Μάθημα: <b className="text-purple-400">{selectedCourse.title}</b></p>
              
              <form onSubmit={handleGradeSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">Βαθμός (0.0 - 10.0)</label>
                  <input 
                    type="number" step="0.1" min="0" max="10" placeholder="e.g. 7.5" value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full p-3.5 bg-zinc-950 text-white rounded-xl border border-zinc-800 text-lg font-bold focus:outline-none focus:border-purple-500 transition-all" required
                  />
                </div>
                
                <div className="flex items-center gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 select-none">
                  <input 
                    type="checkbox" id="admin_attempt" checked={isAdminFirstAttempt} 
                    onChange={(e) => setIsAdminFirstAttempt(e.target.checked)} 
                    className="w-5 h-5 accent-purple-600 cursor-pointer" 
                  />
                  <label htmlFor="admin_attempt" className="text-sm text-zinc-300 font-semibold cursor-pointer">Πρώτη προσπάθεια φοιτητή (Bonus 1.2x)</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setSelectedCourse(null)} className="flex-1 p-3 bg-zinc-800 text-zinc-400 font-bold rounded-xl border-none cursor-pointer hover:bg-zinc-700 transition-colors">Ακύρωση</button>
                  <button type="submit" className="flex-1 p-3 bg-purple-600 text-white font-bold rounded-xl border-none cursor-pointer hover:bg-purple-700 transition-colors shadow-md">Οριστικοποίηση</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {statsStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-md relative shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2 tracking-wide">⚙️ Άμεση Διόρθωση Στατιστικών</h3>
              <p className="text-sm text-zinc-400 mb-6">Φοιτητής: <b className="text-purple-400">{statsStudent.username}</b></p>
              
              <form onSubmit={handleStatsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Συνολικά XP</label>
                  <input type="number" value={xpInput} onChange={(e) => setXpInput(e.target.value)} className="w-full p-3 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Επίπεδο (Level)</label>
                  <input type="number" value={levelInput} onChange={(e) => setLevelInput(e.target.value)} className="w-full p-3 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Arcade Coins (🪙)</label>
                  <input type="number" value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} className="w-full p-3 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none font-bold" required />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setStatsStudent(null)} className="flex-1 p-3 bg-zinc-800 text-zinc-400 font-bold rounded-xl border-none cursor-pointer hover:bg-zinc-700 transition-colors">Ακύρωση</button>
                  <button type="submit" className="flex-1 p-3 bg-emerald-600 text-white font-bold rounded-xl border-none cursor-pointer hover:bg-emerald-700 transition-colors shadow-md">Αποθήκευση</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 w-full max-w-sm text-center shadow-2xl">
              <div className="text-3xl mb-2">🚪</div>
              <h3 className="text-lg font-black text-white mb-2">Επιβεβαίωση Αποσύνδεσης</h3>
              <p className="text-sm text-zinc-400 mb-6">Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε από το Admin Panel;</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl border-none cursor-pointer text-xs uppercase tracking-wider transition-colors">Ακύρωση</button>
                <button type="button" onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border-none cursor-pointer text-xs uppercase tracking-wider transition-colors shadow-md">Αποσύνδεση</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}