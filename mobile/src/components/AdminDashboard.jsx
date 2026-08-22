import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const COURSE_DIFFICULTY = {
  "1625-1101": 0.30, "1625-1102": 0.48, "1625-1103": 0.10, "1625-1104": 0.82, "1625-1105": 0.20,
  "1625-1201": 0.60, "1625-1202": 0.56, "1625-1203": 0.72, "1625-1204": 0.58, "1625-1205": 0.62,
  "1625-1301": 0.35, "1625-1302": 0.58, "1625-1303": 0.45, "1625-1304": 0.23, "1625-1305": 0.40,
  "1625-1401": 0.64, "1625-1402": 0.68, "1625-1403": 0.32, "1625-1404": 0.55, "1625-1405": 0.88,
  "1625-1501": 1.00, "1625-1502": 0.37, "1625-1503": 0.56, "1625-1504": 0.35, "1625-1505": 0.32,
  "1625-1601": 0.53, "1625-1602": 0.30, "1625-1603": 0.41, "1625-1604": 0.57, "1625-1605": 0.48,
  "1625-1701": 0.84, "1625-1702": 0.42, "1625-1703": 0.89, "1625-1704": 0.41,
  "1625-1801": 0.53, "1625-1802": 0.29, "1625-1803": 0.56, "1625-1804": 0.79, "1625-1805": 0.52,
  "1625-1901": 0.60, "1625-1902": 0.58, "1625-1903": 0.58, "1625-1904": 0.40, "1625-1905": 0.67, "1625-1906": 0.84
};

const calculateTokensEarned = (grade, courseCode, isFirstAttempt) => {
  if (grade < 5.0) return 0;
  const sigma = COURSE_DIFFICULTY[courseCode] || 0.50;
  return Math.floor(grade * 6 * sigma * (isFirstAttempt ? 1.2 : 1.0));
};

export default function AdminDashboard({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      const { data: studentsData } = await supabase.from('users').select('*').eq('role_id', 2);
      const { data: gradesData } = await supabase.from('user_grades').select('*');
      const { data: coursesData } = await supabase.from('courses').select('*').order('semester', { ascending: true });
      const { data: rewardsData } = await supabase.from('user_rewards').select('*, users(username), store_items(title, tokens_required)');

      const formattedStudents = (studentsData || []).map(s => {
        const studentGrades = (gradesData || []).filter(g => g.user_id === s.id);
        const gradesMap = {};
        studentGrades.forEach(g => {
          gradesMap[g.course_id] = { grade: g.grade, is_first_attempt: g.is_first_attempt };
        });
        return { ...s, grades: gradesMap };
      });

      const formattedRewards = (rewardsData || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        username: r.users?.username || 'Unknown',
        item_title: r.store_items?.title || 'Reward',
        cost: r.store_items?.tokens_required || 0,
        item_id: r.item_id,
        status: r.status
      }));

      setStudents(formattedStudents);
      setRewards(formattedRewards);
      setCourses(coursesData || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const gradeFloat = parseFloat(gradeInput);
    if (isNaN(gradeFloat) || gradeFloat < 0 || gradeFloat > 10) {
      alert("Εισάγετε έγκυρο βαθμό (0-10).");
      return;
    }
    try {
      if (gradeFloat >= 5.0) {
        await supabase.from('user_grades').upsert(
          { user_id: currentStudent.id, course_id: selectedCourse.course_code, grade: gradeFloat, is_first_attempt: isAdminFirstAttempt },
          { onConflict: 'user_id,course_id' }
        );
      } else {
        await supabase.from('user_grades').delete().match({ user_id: currentStudent.id, course_id: selectedCourse.course_code });
      }

      const { data: userGrades } = await supabase.from('user_grades').select('*').eq('user_id', currentStudent.id);
      let totalTokens = 0;
      (userGrades || []).forEach(g => {
        totalTokens += calculateTokensEarned(g.grade, g.course_id, g.is_first_attempt);
      });

      const { data: userRewards } = await supabase.from('user_rewards').select('*, store_items(tokens_required)').eq('user_id', currentStudent.id);
      let spentTokens = 0;
      (userRewards || []).forEach(r => {
        if (r.store_items?.tokens_required) spentTokens += r.store_items.tokens_required;
      });

      const finalTokens = Math.max(0, totalTokens - spentTokens);
      const totalXp = totalTokens * 100;
      const level = Math.max(1, Math.floor(totalXp / 1000) + 1);

      await supabase.from('users').update({ tokens: finalTokens, total_xp: totalXp, level: level }).eq('id', currentStudent.id);

      setSelectedCourse(null);
      setGradeInput('');
      await fetchData(); 
      alert("✨ Ο βαθμός καταχωρήθηκε επιτυχώς!");
    } catch (err) {
      alert("Αποτυχία καταχώρησης.");
    }
  };

  const handleStatsSubmit = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('users').update({
        total_xp: parseInt(xpInput),
        level: parseInt(levelInput),
        tokens: parseInt(tokensInput)
      }).eq('id', statsStudent.id);

      setStatsStudent(null);
      await fetchData();
      alert("⚙️ Στατιστικά ενημερώθηκαν!");
    } catch (err) {
      alert("Αποτυχία ενημέρωσης.");
    }
  };

  const handleRewardAction = async (reward, action) => {
    try {
      if (action === "approve") {
        await supabase.from('user_rewards').update({ status: 'Approved' }).eq('id', reward.id);
      } else if (action === "delete") {
        if (reward.status === "Pending") {
          const { data: student } = await supabase.from('users').select('tokens').eq('id', reward.user_id).single();
          if (student) {
            await supabase.from('users').update({ tokens: student.tokens + reward.cost }).eq('id', reward.user_id);
          }
        }
        await supabase.from('user_rewards').delete().eq('id', reward.id);
      }
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const openStudentProfile = (student) => {
    setCurrentStudent(student);
    setActiveSemesterTab(1); 
    setView('student_view'); 
    setIsMenuOpen(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
        <p style={{ fontWeight: 'bold', color: '#c084fc' }}>Φόρτωση Admin...</p>
      </div>
    );
  }

  const filteredCourses = courses.filter(c => Number(c.semester) === activeSemesterTab);

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

        <button 
          type="button"
          onClick={() => setShowLogoutConfirm(true)} 
          style={{ padding: '6px 12px', backgroundColor: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🚪 Έξοδος
        </button>
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
          width: '260px',
          backgroundColor: '#09090b',
          borderRight: '1px solid #27272a',
          padding: '20px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease-in-out'
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #27272a' }}>
            <span style={{ fontSize: '16px', fontWeight: '900', color: '#a855f7' }}>StudyArc ADMIN</span>
            <button 
              type="button"
              onClick={() => setIsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              type="button"
              onClick={() => { setView('students'); setIsMenuOpen(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: view === 'students' ? '#9333ea' : '#18181b',
                color: view === 'students' ? '#ffffff' : '#a1a1aa'
              }}
            >
              👥 Λίστα Φοιτητών
            </button>

            <button 
              type="button"
              onClick={() => { setView('rewards'); setIsMenuOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: view === 'rewards' ? '#9333ea' : '#18181b',
                color: view === 'rewards' ? '#ffffff' : '#a1a1aa'
              }}
            >
              <span>🎁 Έλεγχος Δώρων</span>
              {rewards.filter(r => r.status === "Pending").length > 0 && (
                <span style={{ backgroundColor: '#eab308', color: '#000000', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '10px' }}>
                  {rewards.filter(r => r.status === "Pending").length}
                </span>
              )}
            </button>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => { setIsMenuOpen(false); setShowLogoutConfirm(true); }}
          style={{ width: '100%', padding: '10px', backgroundColor: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🚪 Αποσύνδεση Admin
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        
        {view === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '14px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>👥 Εγγεγραμμένοι Φοιτητές</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a1a1aa' }}>Διαχειριστής: <b style={{ color: '#c084fc' }}>{user.username}</b></p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.1)', padding: '4px 8px', borderRadius: '8px' }}>{students.length} Σύνολο</span>
            </div>

            {students.map((s) => (
              <div key={s.id} style={{ backgroundColor: '#18181b', padding: '14px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: '900' }}>{s.username}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: '6px' }}>Level {s.level}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', backgroundColor: '#09090b', padding: '8px 12px', borderRadius: '10px', border: '1px solid #27272a' }}>
                  <span>XP: <b style={{ color: '#34d399' }}>{s.total_xp}</b></span>
                  <span>Coins: <b style={{ color: '#eab308' }}>{s.tokens} 🪙</b></span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => { setStatsStudent(s); setXpInput(s.total_xp); setLevelInput(s.level); setTokensInput(s.tokens); }}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', color: '#d4d4d8', fontWeight: 'bold', fontSize: '11px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    ⚙️ Στατιστικά
                  </button>
                  <button 
                    type="button"
                    onClick={() => openStudentProfile(s)}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#9333ea', color: '#ffffff', fontWeight: 'bold', fontSize: '11px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    🎓 Μαθήματα
                  </button>
                </div>
              </div>
            ))}

            {students.length === 0 && (
              <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '14px', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
                Δεν υπάρχουν ακόμη εγγεγραμμένοι φοιτητές.
              </div>
            )}
          </div>
        )}

        {view === 'student_view' && currentStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <button type="button" onClick={() => setView('students')} style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0, marginBottom: '2px' }}>← Πίσω</button>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>{currentStudent.username}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#eab308', display: 'block' }}>{currentStudent.tokens} 🪙</span>
                <span style={{ fontSize: '10px', color: '#71717a' }}>Level {currentStudent.level}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((sem) => (
                <button 
                  key={sem}
                  type="button"
                  onClick={() => setActiveSemesterTab(sem)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeSemesterTab === sem ? '#9333ea' : '#18181b',
                    color: activeSemesterTab === sem ? '#ffffff' : '#a1a1aa'
                  }}
                >
                  {sem}ο Εξάμ.
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredCourses.map((course) => {
                const courseData = currentStudent.grades[course.course_code];
                const hasGrade = courseData !== undefined;

                return (
                  <div key={course.course_code} style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#a1a1aa', backgroundColor: '#09090b', padding: '2px 6px', borderRadius: '4px' }}>{course.course_code}</span>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: hasGrade && courseData.grade >= 5 ? '#34d399' : '#71717a' }}>
                        {hasGrade ? `Βαθμός: ${courseData.grade}` : 'Μη Καταχωρημένο'}
                      </span>
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{course.title}</span>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>σ = {course.difficulty_multiplier}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedCourse(course);
                          setGradeInput(hasGrade ? courseData.grade.toString() : '');
                          setIsAdminFirstAttempt(hasGrade ? courseData.is_first_attempt : true);
                        }} 
                        style={{ padding: '6px 12px', backgroundColor: '#9333ea', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                      >
                        {hasGrade ? "📝 Αλλαγή" : "➕ Βαθμός"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'rewards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '14px', border: '1px solid #27272a' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>🎁 Αιτήματα Δώρων</h3>
            </div>

            {rewards.map((r) => (
              <div key={r.id} style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '14px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#c084fc' }}>{r.username}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#eab308' }}>{r.cost} 🪙</span>
                </div>

                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{r.item_title}</span>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: r.status === "Approved" ? '#34d399' : '#eab308' }}>
                    {r.status === "Approved" ? "Εγκρίθηκε" : "Εκκρεμεί"}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {r.status === "Pending" && (
                      <button type="button" onClick={() => handleRewardAction(r, "approve")} style={{ padding: '4px 8px', backgroundColor: '#059669', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Έγκριση</button>
                    )}
                    <button type="button" onClick={() => handleRewardAction(r, "delete")} style={{ padding: '4px 8px', backgroundColor: '#27272a', color: '#f87171', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                      {r.status === "Pending" ? "Απόρριψη" : "Διαγραφή"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {rewards.length === 0 && (
              <div style={{ backgroundColor: '#18181b', padding: '24px', borderRadius: '14px', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
                Καμία αίτηση εξαργύρωσης.
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL GRADE */}
      {selectedCourse && currentStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', width: '100%', maxWidth: '280px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '900' }}>Καταχώρηση Βαθμού</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#a1a1aa' }}>{selectedCourse.title}</p>
            
            <form onSubmit={handleGradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="number" step="0.1" min="0" max="10" placeholder="Βαθμός (π.χ. 8.5)" value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '10px', border: '1px solid #27272a', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }} required
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" id="admin_attempt" checked={isAdminFirstAttempt} 
                  onChange={(e) => setIsAdminFirstAttempt(e.target.checked)} 
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="admin_attempt" style={{ fontSize: '11px', color: '#d4d4d8' }}>1η Προσπάθεια (1.2x)</label>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setSelectedCourse(null)} style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Ακύρωση</button>
                <button type="submit" style={{ flex: 1, padding: '8px', backgroundColor: '#9333ea', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Αποθήκευση</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL STATS */}
      {statsStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', width: '100%', maxWidth: '280px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '900' }}>⚙️ Στατιστικά</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#a1a1aa' }}>{statsStudent.username}</p>
            
            <form onSubmit={handleStatsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="number" placeholder="XP" value={xpInput} onChange={(e) => setXpInput(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px', boxSizing: 'border-box' }} required />
              <input type="number" placeholder="Level" value={levelInput} onChange={(e) => setLevelInput(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px', boxSizing: 'border-box' }} required />
              <input type="number" placeholder="Tokens" value={tokensInput} onChange={(e) => setTokensInput(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#09090b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px', boxSizing: 'border-box' }} required />
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setStatsStudent(null)} style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Ακύρωση</button>
                <button type="submit" style={{ flex: 1, padding: '8px', backgroundColor: '#059669', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Αποθήκευση</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM LOGOUT */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', width: '100%', maxWidth: '260px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '900' }}>Αποσύνδεση</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#a1a1aa' }}>Έξοδος από το Admin Panel;</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#27272a', color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Ακύρωση</button>
              <button type="button" onClick={() => { setShowLogoutConfirm(false); onLogout(); }} style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Έξοδος</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}