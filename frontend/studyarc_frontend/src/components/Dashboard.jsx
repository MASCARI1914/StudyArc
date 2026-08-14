import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home'); 
  const [dbData, setDbData] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [storeItems, setStoreItems] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentUsername = user?.username || "Φοιτητής";

  const showToast = (msg, isErr = false) => {
    setToast({ show: true, message: msg, isError: isErr });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 4000);
  };

  const fetchDashboardData = async () => {
    const uid = user?.user_id;
    if (!uid) { setLoading(false); return; }
    try {
      const response = await axios.get(`${API_URL}/dashboard/${uid}`);
      setDbData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Σφάλμα φόρτωσης Dashboard:", error);
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/leaderboard`);
      setLeaders(response.data);
    } catch (error) { 
      console.error("Σφάλμα φόρτωσης Leaderboard:", error); 
    }
  };

  const fetchStoreItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/store/items`);
      setStoreItems(response.data);
    } catch (error) { 
      console.error("Σφάλμα φόρτωσης Store Items:", error); 
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchLeaderboard();
      fetchStoreItems();
    }
  }, [user]);

  const handleClaimReward = async (itemId, tokensRequired, itemTitle) => {
    const currentTokens = dbData?.user?.tokens || 0;
    if (currentTokens < tokensRequired) {
      showToast(`❌ Χρειάζεστε ${tokensRequired} Tokens για το δώρο "${itemTitle}"!`, true);
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/store/claim`, { user_id: user.user_id, item_id: itemId });
      if (res.data.status === "success") {
        showToast(`✨ Η εξαργύρωση έγινε! Τα ${tokensRequired} Tokens αφαιρέθηκαν. Αναμονή για Admin.`);
        fetchDashboardData();
      }
    } catch (error) { 
      showToast("Αποτυχία εξαργύρωσης.", true); 
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-sans">
        <p className="text-xl font-bold animate-pulse text-purple-400">Φόρτωση StudyArc...</p>
      </div>
    );
  }

  const passedCoursesCount = dbData?.courses?.filter(c => c.grade >= 5).length || 0;

  // 🔄 Χαρτογράφηση activeTab σε αριθμό εξαμήνου (1 έως 9)
  const getSemesterNumber = () => {
    if (activeTab.startsWith('semester_')) {
      return parseInt(activeTab.split('_')[1], 10);
    }
    return 0;
  };

  const currentSemesterNum = getSemesterNumber();
  const filteredCourses = dbData?.courses?.filter(c => Number(c.semester) === currentSemesterNum) || [];

  const semesterLabels = {
    1: "📘 ΜΑΘΗΜΑΤΑ Α' ΕΞΑΜΗΝΟΥ",
    2: "💡 ΜΑΘΗΜΑΤΑ Β' ΕΞΑΜΗΝΟΥ",
    3: "⚡ ΜΑΘΗΜΑΤΑ Γ' ΕΞΑΜΗΝΟΥ",
    4: "🔥 ΜΑΘΗΜΑΤΑ Δ' ΕΞΑΜΗΝΟΥ",
    5: "🚀 ΜΑΘΗΜΑΤΑ Ε' ΕΞΑΜΗΝΟΥ",
    6: "💻 ΜΑΘΗΜΑΤΑ ΣΤ' ΕΞΑΜΗΝΟΥ",
    7: "🌐 ΜΑΘΗΜΑΤΑ Ζ' ΕΞΑΜΗΝΟΥ",
    8: "🛡️ ΜΑΘΗΜΑΤΑ Η' ΕΞΑΜΗΝΟΥ",
    9: "🤖 ΜΑΘΗΜΑΤΑ Θ' ΕΞΑΜΗΝΟΥ"
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col justify-between select-none overflow-y-auto">
        <div>
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 mb-8 block text-left bg-transparent border-none cursor-pointer w-full hover:opacity-80 transition-opacity p-0">
            <img src="/StudyArc.png" alt="StudyArc Logo" className="w-7 h-7 object-contain" />
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">StudyArc</span>
          </button>
          
          <nav className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Ακαδημαϊκά Εξάμηνα</p>
              <div className="space-y-1">
                {[
                  { id: 'semester_1', label: "📘 Α' Εξάμηνο" },
                  { id: 'semester_2', label: "💡 Β' Εξάμηνο" },
                  { id: 'semester_3', label: "⚡ Γ' Εξάμηνο" },
                  { id: 'semester_4', label: "🔥 Δ' Εξάμηνο" },
                  { id: 'semester_5', label: "🚀 Ε' Εξάμηνο" },
                  { id: 'semester_6', label: "💻 ΣΤ' Εξάμηνο" },
                  { id: 'semester_7', label: "🌐 Ζ' Εξάμηνο" },
                  { id: 'semester_8', label: "🛡️ Η' Εξάμηνο" },
                  { id: 'semester_9', label: "🤖 Θ' Εξάμηνο" }
                ].map((s) => (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveTab(s.id)} 
                    className={`w-full text-left p-2.5 rounded-xl font-semibold text-xs transition-all border-none cursor-pointer flex items-center ${activeTab === s.id ? 'bg-purple-500/10 text-purple-400 border-l-4 border-purple-500' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Ανταμοιβές</p>
              <div className="space-y-1">
                <button onClick={() => setActiveTab('store')} className={`w-full text-left p-2.5 rounded-xl font-semibold text-xs transition-all border-none cursor-pointer flex items-center ${activeTab === 'store' ? 'bg-purple-500/10 text-purple-400 border-l-4 border-purple-500' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'}`}>🎁 Κατάστημα</button>
                <button onClick={() => setActiveTab('leaderboard')} className={`w-full text-left p-2.5 rounded-xl font-semibold text-xs transition-all border-none cursor-pointer flex items-center ${activeTab === 'leaderboard' ? 'bg-purple-500/10 text-purple-400 border-l-4 border-purple-500' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'}`}>🏆 Κατάταξη</button>
              </div>
            </div>
          </nav>
        </div>

        <button onClick={() => setShowLogoutConfirm(true)} className="w-full p-3 mt-6 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-500/20 rounded-xl font-bold text-sm border border-zinc-700 transition-all cursor-pointer">🚪 Αποσύνδεση</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto bg-zinc-900/40">
        <header className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mb-10 shadow-lg select-none">
          <div className="flex gap-6 items-center">
            <div className="text-center bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Μέσος Όρος</p>
              <p className="text-2xl font-black text-blue-400 mt-0.5">{dbData?.gpa || "0.0"}</p>
            </div>
            <div className="text-center bg-purple-500/10 px-5 py-2 rounded-xl border border-purple-500/20">
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Επίπεδο</p>
              <p className="text-2xl font-black text-white mt-0.5">Lvl {dbData?.user?.level || 1}</p>
            </div>
            <div className="text-center bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Arcade Tokens</p>
              <p className="text-2xl font-black text-yellow-500 mt-0.5">{dbData?.user?.tokens || 0} 🪙</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 shadow-md">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm font-black text-white">{currentUsername.charAt(0).toUpperCase()}</div>
            <span className="text-sm font-bold text-zinc-200 tracking-wide">{currentUsername}</span>
          </div>
        </header>

        {activeTab === 'home' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 select-none">
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center py-12">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Γενικός Μέσος Όρος</h3>
              <p className="text-5xl font-black text-blue-400">{dbData?.gpa || "0.0"}</p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center py-12">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Περασμένα Μαθήματα</h3>
              <p className="text-5xl font-black text-purple-400">{passedCoursesCount} / {dbData?.courses?.length || 0}</p>
            </div>
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
            <h3 className="text-xl font-bold mb-6 text-purple-400 select-none">🏆 Παγκόσμια Κατάταξη</h3>
            <div className="space-y-3">
              {leaders.map((u) => (
                <div key={u.rank} className={`flex justify-between items-center p-4 rounded-xl border ${u.username === currentUsername ? 'bg-purple-500/10 border-purple-500' : 'bg-zinc-950 border-zinc-800/60'}`}>
                  <span className="font-bold">{u.rank}. {u.username}</span>
                  <span className="font-mono text-emerald-400 font-bold">Lvl {u.level} ({u.total_xp.toLocaleString()} XP)</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'store' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center select-none bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-md">
              <div>
                <h3 className="text-2xl font-black text-white">🎁 Arcade Κατάστημα Ανταμοιβών</h3>
                <p className="text-xs text-zinc-400 mt-1">Εξαργυρώστε τα Tokens σας σε πραγματικά κουπόνια, χορηγίες και tech prizes!</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-xl text-yellow-500 font-bold text-sm">
                Διαθέσιμα: <span className="font-mono text-base">{dbData?.user?.tokens || 0}</span> 🪙
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeItems.map((item) => {
                const currentTokens = dbData?.user?.tokens || 0;
                const claimStatus = dbData?.claims ? dbData.claims[item.id] : undefined;

                // Δυναμικός υπολογισμός Tier Badge βάσει των Tiers της τεκμηρίωσης
                let tierBadge = { name: "Tier 1: Daily Boost", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
                if (item.tokens_required >= 1000) {
                  tierBadge = { name: "👑 Tier 4: Graduation Grand Prize", color: "text-amber-400 bg-amber-500/10 border-amber-500/30 font-black" };
                } else if (item.tokens_required >= 100) {
                  tierBadge = { name: "⚡ Tier 3: Tech & Lifestyle", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
                } else if (item.tokens_required >= 25) {
                  tierBadge = { name: "🍔 Tier 2: Student Meal", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
                }

                return (
                  <div key={item.id} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between shadow-md hover:border-zinc-700 transition-all">
                    <div>
                      <div className="flex justify-between items-center select-none mb-3">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border ${tierBadge.color}`}>
                          {tierBadge.name}
                        </span>
                        {claimStatus && (
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${claimStatus === "Approved" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {claimStatus === "Approved" ? "✨ Εγκρίθηκε!" : "⏳ Σε αναμονή..."}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-lg font-black text-white">{item.title}</h4>
                      <p className="text-sm text-zinc-400 mt-2">{item.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-800/60 flex justify-between items-center select-none">
                      <span className="text-sm font-black text-yellow-500 font-mono">
                        {item.tokens_required} Tokens 🪙
                      </span>
                      <button 
                        disabled={claimStatus !== undefined || currentTokens < item.tokens_required}
                        onClick={() => handleClaimReward(item.id, item.tokens_required, item.title)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${claimStatus ? 'bg-zinc-950 text-zinc-600 cursor-not-allowed' : currentTokens >= item.tokens_required ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                      >
                        {claimStatus === "Approved" ? "🔒 Εξαργυρώθηκε" : claimStatus === "Pending" ? "⏳ Σε αναμονή έγκρισης" : currentTokens >= item.tokens_required ? "🎁 Εξαργύρωση" : `🔒 Λείπουν ${item.tokens_required - currentTokens} 🪙`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ΛΙΣΤΑ ΜΑΘΗΜΑΤΩΝ ΦΟΙΤΗΤΗ */
          <div>
            <h3 className="text-2xl font-extrabold text-white mb-6 uppercase tracking-wide select-none">
              {semesterLabels[currentSemesterNum] || "ΜΑΘΗΜΑΤΑ"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start select-none">
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">{course.course_code}</span>
                      <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">σ = {course.difficulty_multiplier}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white mt-4">{course.title}</h4>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-800/60 flex justify-between items-center select-none">
                    <span className="text-xs text-zinc-500 font-bold">{course.ects} ECTS</span>
                    <p className={`text-sm font-black ${course.grade >= 5 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {course.grade >= 5 ? `Βαθμός: ${course.grade} ${course.is_first_attempt ? '(1η Προσπάθεια)' : '(Επανεξέταση)'}` : '🛑 Μη Καταχωρημένο'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 w-full max-w-sm text-center shadow-2xl">
              <h3 className="text-lg font-black text-white mb-2">Επιβεβαίωση Αποσύνδεσης</h3>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 p-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl border-none cursor-pointer">Ακύρωση</button>
                <button type="button" onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl border-none cursor-pointer">Αποσύνδεση</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border font-bold text-sm z-50 ${toast.isError ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{toast.message}</div>}
      </main>
    </div>
  );
}