'use client';

import { useState, useEffect } from 'react';
import { loadUsers } from '../lib/users';

const BRANCHES = [
  { id: 'anlurich', name: 'ANLURICH OC', location: 'Silang Cavite' },
  { id: 'avenders', name: 'Avenders Auto Parts', location: 'Sta.Rosa Laguna' },
  { id: 'dasma', name: 'Dasma Auto Parts', location: 'Dasma Cavite' },
  { id: 'lipa', name: 'Lipa Auto Parts', location: 'Lipa Batangas' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts', location: 'Baliwag Bulacan' },
  { id: 'timitsu', name: 'Timitsu Baliwag Bulacan', location: 'Baliwag Bulacan' },
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
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const ann = localStorage.getItem(ANNOUNCEMENTS_KEY);
    if (ann) setAnnouncements(JSON.parse(ann));
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

  const post = () => {
    if (!newAnnouncement.trim()) return;
    const item = { id: Date.now().toString(), text: newAnnouncement.trim(), author: 'System', date: new Date().toISOString() };
    const updated = [item, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updated));
    setNewAnnouncement('');
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="#e5e7eb" stroke="#111827" strokeWidth="2" />
            <circle cx="32" cy="32" r="10" fill="#111827" />
            <circle cx="32" cy="32" r="4" fill="#f4f6fb" />
            <path d="M32 6v10M32 48v10M6 32h10M48 32h10M12 12l7 7M45 45l7 7M12 52l7-7M45 19l7-7" stroke="#6b7280" strokeWidth="3" />
            <circle cx="32" cy="32" r="20" fill="none" stroke="#9ca3af" strokeWidth="6" strokeDasharray="8 6" />
          </svg>
          <h1 className="text-2xl md:text-4xl font-black tracking-wide text-[#1e3a8a]">AUTO PARTS INVENTORY SYSTEM (APIS)</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {BRANCHES.map((b) => (
            <button key={b.id} onClick={() => selectBranch(b.id)} className="text-center">
              <div className="bg-gradient-to-b from-[#7c6bff] to-[#6d5efc] text-white rounded-xl px-3 py-4 font-semibold shadow">{b.name}</div>
              <div className="text-sm text-gray-700 mt-2">{b.location}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden mb-5 shadow">
          <div className="h-48 md:h-64 bg-gradient-to-r from-sky-200 via-blue-100 to-orange-200 flex items-center justify-end pr-8">
            <svg width="260" height="160" viewBox="0 0 260 160">
              <path d="M20 120 C60 20, 110 20, 140 90 C160 130, 190 20, 240 70" fill="none" stroke="#dbeafe" strokeWidth="22" />
              <path d="M10 140 C70 40, 120 50, 150 110 C175 150, 200 40, 250 90" fill="none" stroke="#bfdbfe" strokeWidth="18" />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="text-lg font-semibold">AI-powered platform by ANLU... 🥰🥰🥰</div>
          <div className="flex gap-2">
            <button onClick={() => (window.location.href = '/salary')} className="bg-green-700 text-white px-5 py-2 rounded-full text-sm">Salary</button>
            <button onClick={() => selectBranch('admin')} className="bg-black text-white px-8 py-3 rounded-full font-bold">ADMIN</button>
          </div>
        </div>

        <div className="bg-white text-gray-900 rounded-2xl shadow p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Announcements</h2>
            <button onClick={() => setShowForm(!showForm)} className="text-sm text-blue-700">{showForm ? 'Cancel' : '+ New'}</button>
          </div>
          {showForm && (
            <div className="mb-3">
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} />
              <button onClick={post} className="mt-2 bg-blue-700 text-white px-4 py-1 rounded text-sm">Post</button>
            </div>
          )}
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-sm">No announcements</p>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="border-t py-2 text-sm">
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
            <p className="text-sm text-gray-500 mb-3">{loginFor === 'admin' ? 'ADMIN' : BRANCHES.find((b) => b.id === loginFor)?.name}</p>
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
