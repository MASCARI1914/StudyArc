import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth({ onLoginSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Παρακαλώ συμπληρώστε όλα τα πεδία.");
      return;
    }

    setLoading(true);

    if (isLoginTab) {
      // 🔑 LOG IN ΜΕΣΩ SUPABASE
      try {
        const { data: user, error: fetchErr } = await supabase
          .from('users')
          .select('id, username, password_hash, role_id, total_xp, level, tokens')
          .eq('username', trimmedUsername)
          .single();

        if (fetchErr || !user) {
          setError("Λάθος στοιχεία σύνδεσης ή ο χρήστης δεν υπάρχει.");
          setLoading(false);
          return;
        }

        // Έλεγχος κωδικού
        if (user.password_hash !== password) {
          setError("Λάθος κωδικός πρόσβασης.");
          setLoading(false);
          return;
        }

        onLoginSuccess({
          token: 'token-' + user.id + '-' + Date.now(),
          user_id: user.id,
          username: user.username,
          role_id: user.role_id,
          total_xp: user.total_xp,
          level: user.level,
          tokens: user.tokens
        });
      } catch (err) {
        console.error("Σφάλμα κατά το Login:", err);
        setError("Αποτυχία σύνδεσης. Ελέγξτε το δίκτυό σας.");
      } finally {
        setLoading(false);
      }
    } else {
      // 📝 SIGN UP ΜΕΣΩ SUPABASE
      try {
        // Έλεγχος αν υπάρχει ήδη ο χρήστης
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', trimmedUsername)
          .single();

        if (existingUser) {
          setError("Το Username υπάρχει ήδη.");
          setLoading(false);
          return;
        }

        const assignedRole = trimmedUsername.toLowerCase() === "christos" ? 1 : 2;

        const { error: insertErr } = await supabase
          .from('users')
          .insert([
            {
              username: trimmedUsername,
              password_hash: password,
              role_id: assignedRole,
              total_xp: 0,
              level: 1,
              tokens: 0
            }
          ]);

        if (insertErr) {
          setError("Σφάλμα δημιουργίας λογαριασμού: " + insertErr.message);
        } else {
          setSuccessMessage("Ο λογαριασμός δημιουργήθηκε! Επιλέξτε 'LOG IN' για να συνδεθείτε.");
          setPassword('');
          setIsLoginTab(true);
        }
      } catch (err) {
        console.error("Σφάλμα κατά το Register:", err);
        setError("Κάτι πήγε στραβά κατά την εγγραφή.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white font-sans">
      <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-sm shadow-2xl">
        
        <div className="flex items-center justify-center gap-3 mb-6 select-none">
          <img src="/StudyArc.png" alt="StudyArc Logo" className="w-8 h-8 object-contain" />
          <h2 className="text-3xl font-black bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent tracking-wider">
            StudyArc
          </h2>
        </div>

        {/* TABS */}
        <div className="flex border-b border-zinc-800 mb-6 select-none">
          <button
            type="button" onClick={() => { setIsLoginTab(true); setError(''); setSuccessMessage(''); }}
            className={`flex-1 pb-3 text-sm font-bold border-none bg-transparent cursor-pointer transition-colors ${isLoginTab ? 'text-purple-400 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            LOG IN
          </button>
          <button
            type="button" onClick={() => { setIsLoginTab(false); setError(''); setSuccessMessage(''); }}
            className={`flex-1 pb-3 text-sm font-bold border-none bg-transparent cursor-pointer transition-colors ${!isLoginTab ? 'text-purple-400 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            SIGN IN
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs font-bold text-center mb-6">❌ {error}</div>}
        {successMessage && <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-400 text-xs font-bold text-center mb-6">✨ {successMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Username / ΑΕΜ</label>
            <input 
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-semibold"
              placeholder={isLoginTab ? "Εισάγετε το Username σας" : "Δημιουργήστε ένα Username"} required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Κωδικός</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pr-12 bg-zinc-950 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-semibold"
                placeholder="••••••••" required
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-zinc-500 hover:text-zinc-300 cursor-pointer text-xs font-bold select-none transition-colors"
              >
                {showPassword ? "👁️ Απόκρυψη" : "👁️ Εμφάνιση"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full p-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg border-none cursor-pointer mt-4 text-sm uppercase tracking-wider"
          >
            {loading ? "Παρακαλώ περιμένετε..." : isLoginTab ? "Σύνδεση (Log In)" : "Εγγραφή (Sign In)"}
          </button>
        </form>
      </div>
    </div>
  );
}