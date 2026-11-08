'use client';

import { useState, useEffect } from 'react';
import { loadUsers } from '../lib/users';

const BUTTONS = [
  { id: 'anlurich', name: 'Anlurich OPC', location: 'Silang Cavite' },
  { id: 'avenders', name: 'Avenders', location: 'Sta.Rosa Laguna' },
  { id: 'dasma', name: 'Dasma Auto Parts', location: 'Dasma Cavite' },
  { id: 'lipa', name: 'Lipa Auto Parts', location: 'Lipa Batangas' },
  { id: 'sezan', name: 'Baliwag Auto Parts', location: 'Baliwag Bulacan' },
  { id: 'admin', name: 'Anlu Pit', location: 'Admin' },
];

const LOGINS: Record<string, { name: string; password: string }> = {
  anlurich: { name: 'User 1', password: 'Apples!' },
  dasma: { name: 'User 1', password: 'Grapes!' },
  lipa: { name: 'User 1', password: 'Oranges!' },
  sezan: { name: 'User 1', password: 'Mangoes!' },
  timitsu: { name: 'User 1', password: 'Avocado!' },
  avenders: { name: 'User 1', password: 'Thor!' },
  admin: { name: 'Anlupit', password: 'Guitar88!' },
};

const ANNOUNCEMENTS_KEY = 'anlurich-announcements';
const BRANCH_KEY = 'anlurich-branch';

export default function Home() {
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [announcements, setAnnouncements] = useState<{ id: string; text: string; author: string; date: string }[]>([]);
  const [bg, setBg] = useState('#f4f6fb');
  const [banner, setBanner] = useState('');
  const [logo, setLogo] = useState('');

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const rows: { key: string; value: string }[] = await res.json();
        const row = rows.find((r) => r.key === ANNOUNCEMENTS_KEY);
        if (row?.value) {
          const list = JSON.parse(row.value);
          setAnnouncements(list);
          localStorage.setItem(ANNOUNCEMENTS_KEY, row.value);
          return;
        }
      }
    } catch {}
    const ann = localStorage.getItem(ANNOUNCEMENTS_KEY);
    if (ann) setAnnouncements(JSON.parse(ann));
  };

  useEffect(() => {
    loadAnnouncements();
    setBg(localStorage.getItem('anlurich-index-bg') || '#f4f6fb');
    setBanner(localStorage.getItem('anlurich-index-banner') || '/banner.png');
    setLogo(localStorage.getItem('anlurich-index-logo') || '/logo.png');
  }, []);

  const selectBranch = (id: string) => {
    setLoginFor(id);
    setLoginName('');
    setLoginPassword('');
    setLoginError('');
  };

  const submitLogin = async () => {
    if (!loginFor) return;
    const users = await loadUsers();
    const ok = users.some((u) => u.branch === loginFor && u.name === loginName.trim() && u.password === loginPassword);
    if (ok) {
      localStorage.setItem(BRANCH_KEY, loginFor);
      sessionStorage.setItem('anlurich-auth', loginFor);
      window.location.href = loginFor === 'admin' ? '/admin' : `/branch/${loginFor}`;
      return;
    }
    setLoginError('Wrong login name or password');
  };

  return (
    <div className="h-screen overflow-hidden text-gray-900" style={{ background: bg }}>
      <div className="h-full max-w-[1600px] mx-auto px-3 pt-2 pb-2 md:px-[15ch] md:pb-8 flex flex-col">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-1">
          {logo ? <img src={logo} alt="Logo" className="w-12 h-12 md:w-[185px] md:h-[185px] object-contain" /> : (
          <svg width="48" height="48" viewBox="0 0 64 64" className="md:w-32 md:h-32">
            <circle cx="32" cy="32" r="28" fill="#e5e7eb" stroke="#111827" strokeWidth="2" />
            <circle cx="32" cy="32" r="10" fill="#111827" />
            <circle cx="32" cy="32" r="4" fill="#f4f6fb" />
            <path d="M32 6v10M32 48v10M6 32h10M48 32h10M12 12l7 7M45 45l7 7M12 52l7-7M45 19l7-7" stroke="#6b7280" strokeWidth="3" />
            <circle cx="32" cy="32" r="20" fill="none" stroke="#9ca3af" strokeWidth="6" strokeDasharray="8 6" />
          </svg>
          )}
          <h1 className="text-sm leading-tight md:text-3xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-2 justify-items-center">
          {BUTTONS.map((b) => (
            <button key={b.id} onClick={() => selectBranch(b.id)} className="text-center w-full md:w-[85%]">
              <div className="h-12 md:h-12 bg-gradient-to-b from-[#7c6bff] to-[#6d5efc] text-white rounded-xl px-2 py-1 md:px-3 text-xs md:text-sm font-semibold shadow flex items-center justify-center text-center">{b.name}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-xl overflow-hidden mb-2 shadow bg-white min-h-0">
          {banner ? (
            <img src={banner} alt="Banner" className="w-full h-full object-cover object-center" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-sky-200 via-blue-100 to-orange-200" />
          )}
        </div>

        <div className="text-sm font-semibold mb-2 text-center md:text-right">Powered & Designed by Anlu</div>

        <div className="bg-white text-gray-900 rounded-xl shadow p-3 mb-2">
          <h2 className="font-semibold mb-1 text-base">Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-base">No announcements</p>
          ) : (
            announcements.slice(0, 1).map((a) => (
              <div key={a.id} className="text-base md:text-lg">
                <div className="font-medium text-blue-700">{a.author}</div>
                <div>{a.text}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {loginFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <h2 className="font-bold mb-1">Login</h2>
            <p className="text-sm text-gray-500 mb-3">{loginFor === 'admin' ? 'Anlu Pit' : BUTTONS.find((b) => b.id === loginFor)?.name}</p>
            <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Login Name" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            <input type="password" className="w-full border rounded px-3 py-2 mb-2" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            {loginError && <p className="text-red-600 text-sm mb-2">{loginError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setLoginFor(null)} className="flex-1 bg-gray-400 text-white py-2 rounded">Cancel</button>
              <button onClick={submitLogin} className="flex-1 bg-purple-600 text-white py-2 rounded">Enter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
