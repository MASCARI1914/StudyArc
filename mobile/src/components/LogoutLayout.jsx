import React from 'react';

export default function LogoutLayout() {
  return (
    <div className="logout-wrapper">
      <style>{`
        .logout-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-h: 100vh;
          height: 100vh;
          background-color: #000000;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .logout-box {
          background: #18181b;
          border: 1px solid #27272a;
          padding: 2.5rem;
          border-radius: 1.5rem;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          max-width: 360px;
          width: 100%;
        }
        .logout-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          animation: pulse 2s infinite;
        }
        .logout-title {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          background: linear-gradient(to right, #a855f7, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .logout-text {
          color: #a1a1aa;
          font-size: 0.875rem;
          font-weight: 500;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
      `}</style>
      
      <div className="logout-box">
        <div className="logout-icon">🚪</div>
        <h2 className="logout-title">StudyArc</h2>
        <p className="logout-text">Αποσύνδεση σε εξέλιξη... Παρακαλώ περιμένετε.</p>
      </div>
    </div>
  );
}