import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Dashboard({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); 
  const [storeYearFilter, setStoreYearFilter] = useState(1);
  const [dbData, setDbData] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [storeItems, setStoreItems] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentUsername = user?.username || "Φοιτητής";
  const userLevel = dbData?.user?.level || 1;
  const userTokens = dbData?.user?.tokens || 0;

  const showToast = (msg, isErr = false) => {
    setToast({ show: true, message: msg, isError: isErr });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 4000);
  };

  const fetchDashboardData = async () => {
    const uid = user?.user_id;
    if (!uid) { setLoading(false); return; }
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', uid).single();
      const { data: coursesData } = await supabase.from('courses').select('*').order('semester', { ascending: true });
      const { data: gradesData } = await supabase.from('user_grades').select('*').eq('user_id', uid);
      const { data: claimsData } = await supabase.from('user_rewards').select('*').eq('user_id', uid);

      const userGradesMap = {};
      (gradesData || []).forEach(g => { userGradesMap[g.course_id] = g; });

      const coursesList = (coursesData || []).map(c => {
        const ug = userGradesMap[c.course_code];
        return {
          id: c.course_code,
          title: c.title,
          course_code: c.course_code,
          ects: c.ects,
          difficulty_multiplier: c.difficulty_multiplier,
          grade: ug ? ug.grade : 0.0,
          semester: Number(c.semester),
          is_first_attempt: ug ? ug.is_first_attempt : true
        };
      });

      const passed = coursesList.filter(c => c.grade >= 5);
      const gpa = passed.length > 0 ? (passed.reduce((acc, curr) => acc + curr.grade, 0) / passed.length).toFixed(2) : "0.0";

      const claimsMap = {};
      (claimsData || []).forEach(c => { claimsMap[c.item_id] = c.status; });

      setDbData({ user: userData, gpa, courses: coursesList, claims: claimsMap });
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await supabase.from('users').select('username, level, total_xp').eq('role_id', 2).order('total_xp', { ascending: false });
      if (data) setLeaders(data.map((u, i) => ({ rank: i + 1, ...u })));
    } catch (error) { console.error(error); }
  };

  const fetchStoreItems = async () => {
    try {
      const { data } = await supabase.from('store_items').select('*').order('id', { ascending: true });
      if (data) setStoreItems(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchLeaderboard();
      fetchStoreItems();
    }
  }, [user]);

  const handleClaimReward = async (itemId, tokensRequired, itemTitle, minLevel) => {
    if (userLevel < minLevel) {
      showToast(`🔒 Απαιτείται Level ${minLevel} για το δώρο "${itemTitle}"!`, true);
      return;
    }
    if (userTokens < tokensRequired) {
      showToast(`❌ Χρειάζεστε ${tokensRequired} Tokens για το δώρο "${itemTitle}"!`, true);
      return;
    }
    try {
      await supabase.from('users').update({ tokens: userTokens - tokensRequired }).eq('id', user.user_id);
      await supabase.from('user_rewards').insert([{ user_id: user.user_id, item_id: itemId, status: 'Pending' }]);
      showToast(`✨ Η εξαργύρωση έγινε!`);
      fetchDashboardData();
    } catch (error) { 
      showToast("Αποτυχία εξαργύρωσης.", true); 
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
        <p style={{ fontWeight: 'bold', color: '#c084fc' }}>Φόρτωση StudyArc...</p>
      </div>
    );
  }

  const passedCoursesCount = dbData?.courses?.filter(c => c.grade >= 5).length || 0;
  const currentSemesterNum = activeTab.startsWith('semester_') ? parseInt(activeTab.split('_')[1], 10) : 0;
  const filteredCourses = dbData?.courses?.filter(c => Number(c.semester) === currentSemesterNum) || [];
  const filteredStoreItems = storeItems.filter(item => (item.min_level || 1) === storeYearFilter);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', overflowX: 'hidden' }}>
      
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(9, 9, 11, 0.95)', borderBottom: '1px solid #27272a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button"
            onClick={() => setIsMenuOpen(true)}
            style={{ padding: '8px 12px', backgroundColor: '#9333ea', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            ☰ Μενού
          </button>
          <span style={{ fontSize: '15px', fontWeight: '900' }}>StudyArc</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#eab308' }}>{userTokens} 🪙</span>
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)} 
            style={{ padding: '6px 10px', backgroundColor: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🚪
          </button>
        </div>
      </header>

      {/* OVERLAY */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 40 }}
        />
      )}

      {/* DRAWER SIDEBAR */}
      <aside 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '270px',
          backgroundColor: '#09090b',
          borderRight: '1px solid #27272a',
          padding: '20px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease-in-out',
          overflowY: 'auto'
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #27272a' }}>
            <span style={{ fontSize: '16px', fontWeight: '900', color: '#a855f7' }}>StudyArc</span>
            <button 
              type="button"
              onClick={() => setIsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              type="button"
              onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activeTab === 'home' ? '#9333ea' : 'transparent', color: activeTab === 'home' ? '#fff' : '#a1a1aa' }}
            >
              🏠 Αρχική
            </button>

            <p style={{ margin: '14px 0 6px 0', fontSize: '10px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Εξάμηνα</p>
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
            ].map(s => (
              <button 
                key={s.id}
                type="button"
                onClick={() => { setActiveTab(s.id); setIsMenuOpen(false); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activeTab === s.id ? '#9333ea' : 'transparent', color: activeTab === s.id ? '#fff' : '#a1a1aa' }}
              >
                {s.label}
              </button>
            ))}

            <p style={{ margin: '14px 0 6px 0', fontSize: '10px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Ανταμοιβές</p>
            <button 
              type="button"
              onClick={() => { setActiveTab('store'); setIsMenuOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activeTab === 'store' ? '#9333ea' : 'transparent', color: activeTab === 'store' ? '#fff' : '#a1a1aa' }}
            >
              🎁 Κατάστημα (Store)
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab('leaderboard'); setIsMenuOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', backgroundColor: activeTab === 'leaderboard' ? '#9333ea' : 'transparent', color: activeTab === 'leaderboard' ? '#fff' : '#a1a1aa' }}
            >
              🏆 Κατάταξη
            </button>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => { setIsMenuOpen(false); setShowLogoutConfirm(true); }}
          style={{ width: '100%', padding: '10px', marginTop: '20px', backgroundColor: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🚪 Αποσύνδεση
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* STATS HEADER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#18181b', padding: '10px', borderRadius: '12px', border: '1px solid #27272a', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>Μ.Ο.</span>
            <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '900', color: '#60a5fa' }}>{dbData?.gpa || "0.0"}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(147, 51, 234, 0.2)', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase' }}>Level</span>
            <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '900', color: '#ffffff' }}>Lvl {userLevel}</p>
          </div>
          <div style={{ backgroundColor: '#18181b', padding: '10px', borderRadius: '12px', border: '1px solid #27272a', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>Tokens</span>
            <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '900', color: '#eab308' }}>{userTokens} 🪙</p>
          </div>
        </div>

        {activeTab === 'home' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>Γενικός Μέσος Όρος</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '40px', fontWeight: '900', color: '#60a5fa' }}>{dbData?.gpa || "0.0"}</p>
            </div>
            <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>Περασμένα Μαθήματα</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '40px', fontWeight: '900', color: '#c084fc' }}>{passedCoursesCount} / {dbData?.courses?.length || 0}</p>
            </div>
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '16px', border: '1px solid #27272a' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '900', color: '#c084fc' }}>🏆 Κατάταξη</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaders.map(u => (
                <div key={u.rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: u.username === currentUsername ? 'rgba(147, 51, 234, 0.15)' : '#09090b', borderRadius: '10px', border: u.username === currentUsername ? '1px solid #9333ea' : '1px solid #27272a' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{u.rank}. {u.username}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#34d399' }}>Lvl {u.level} ({u.total_xp} XP)</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'store' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '14px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '900' }}>🎁 Arcade Store</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#eab308' }}>{userTokens} 🪙</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[1, 2, 3, 4, 5].map(year => (
                <button 
                  key={year}
                  type="button"
                  onClick={() => setStoreYearFilter(year)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: storeYearFilter === year ? '#9333ea' : '#18181b',
                    color: storeYearFilter === year ? '#ffffff' : '#a1a1aa'
                  }}
                >
                  {year}ο Έτος
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredStoreItems.map(item => {
                const claimStatus = dbData?.claims ? dbData.claims[item.id] : undefined;
                const minReqLevel = item.min_level || 1;
                const isLevelLocked = userLevel < minReqLevel;
                const isTokenShort = userTokens < item.tokens_required;

                return (
                  <div key={item.id} style={{ backgroundColor: '#18181b', padding: '14px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.title}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#eab308' }}>{item.tokens_required} 🪙</span>
                    </div>

                    <p style={{ margin: 0, fontSize: '11px', color: '#a1a1aa' }}>{item.description}</p>

                    <button 
                      type="button"
                      disabled={claimStatus !== undefined || isLevelLocked || isTokenShort}
                      onClick={() => handleClaimReward(item.id, item.tokens_required, item.title, minReqLevel)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        marginTop: '4px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: claimStatus || isLevelLocked || isTokenShort ? 'not-allowed' : 'pointer',
                        backgroundColor: claimStatus === "Approved" ? '#059669' : claimStatus === "Pending" ? '#eab308' : isLevelLocked || isTokenShort ? '#27272a' : '#9333ea',
                        color: isLevelLocked || isTokenShort ? '#71717a' : '#ffffff'
                      }}
                    >
                      {claimStatus === "Approved" ? "✨ Εγκρίθηκε" : claimStatus === "Pending" ? "⏳ Σε αναμονή..." : isLevelLocked ? `🔒 Level ${minReqLevel}` : isTokenShort ? `🔒 Λείπουν Tokens` : "🎁 Εξαργύρωση"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '900', color: '#c084fc' }}>{currentSemesterNum}ο ΕΞΑΜΗΝΟ</h3>
            {filteredCourses.map(course => (
              <div key={course.id} style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#a1a1aa', backgroundColor: '#09090b', padding: '2px 6px', borderRadius: '4px' }}>{course.course_code}</span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: course.grade >= 5 ? '#34d399' : '#71717a' }}>
                    {course.grade >= 5 ? `Βαθμός: ${course.grade}` : '🛑 Μη Περασμένο'}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{course.title}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a' }}>
                  <span>{course.ects} ECTS</span>
                  <span>σ = {course.difficulty_multiplier}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', width: '100%', maxWidth: '260px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '900' }}>Αποσύνδεση</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#a1a1aa' }}>Θέλετε να αποσυνδεθείτε;</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Ακύρωση</button>
              <button type="button" onClick={() => { setShowLogoutConfirm(false); onLogout(); }} style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Έξοδος</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', left: '16px', padding: '12px', borderRadius: '12px', backgroundColor: toast.isError ? '#7f1d1d' : '#065f46', color: '#fff', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', zIndex: 70 }}>
          {toast.message}
        </div>
      )}

    </div>
  );
}