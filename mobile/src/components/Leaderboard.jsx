import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/leaderboard`)
      .then(response => {
        setLeaderboard(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Σφάλμα κατά τη φόρτωση του leaderboard:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-darkBg text-white">
        <p className="text-lg font-bold animate-pulse">Φόρτωση Κατάταξης StudyArc...</p>
      </div>
    );
  }

  return (
    <div className="bg-darkCard p-6 rounded-2xl border border-gray-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-extrabold text-white mb-6 text-center bg-gradient-to-r from-brandPurple to-brandBlue bg-clip-text text-transparent tracking-wide select-none">
        🏆 ΠΑΓΚΟΣΜΙΑ ΚΑΤΑΤΑΞΗ ΦΟΙΤΗΤΩΝ
      </h2>
      
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-xs font-bold uppercase tracking-wider select-none">
              <th className="p-4 text-center">Θέση</th>
              <th className="p-4">Φοιτητής</th>
              <th className="p-4 text-center">Επίπεδο</th>
              <th className="p-4 text-right">Συνολικά XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-darkPanel/40">
            {leaderboard.map((user) => (
              <tr key={user.rank} className="hover:bg-gray-800/40 transition-all duration-200 text-white">
                <td className="p-4 text-center font-bold text-brandBlue">
                  {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
                </td>
                <td className="p-4 font-semibold tracking-wide">{user.username}</td>
                <td className="p-4 text-center">
                  <span className="bg-brandPurple/20 text-brandPurple text-xs font-bold px-2.5 py-1 rounded-md border border-brandPurple/30">
                    Lvl {user.level}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-bold text-emerald-400">
                  {user.total_xp.toLocaleString()} XP
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 font-medium">
                  Δεν υπάρχουν ακόμα φοιτητές στην κατάταξη.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}