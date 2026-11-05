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
  admin: { name: 'Anlupit', password: 'Guitar88!' },
};

const ANNOUNCEMENTS_KEY = 'anlurich-announcements';
const BRANCH_KEY = 'anlurich-branch';

export default function Home() {
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#1e3a5f" strokeWidth="2" />
          <circle cx="20" cy="20" r="6" fill="#1e3a5f" />
        </svg>
        <h1 className="text-xl font-bold tracking-wide text-gray-900">AUTO PARTS INVENTORY SYSTEM (APIS)</h1>
      </div>

      {/* Branch Buttons */}
      <div className="px-6 py-4 flex flex-wrap justify-center gap-3">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            onClick={() => selectBranch(b.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center min-w-[120px]"
          >
            <div className="font-semibold text-sm">{b.name}</div>
            <div className="text-xs opacity-80">{b.location}</div>
          </button>
        ))}
      </div>

      {/* Banner */}
      <div className="mx-6 rounded-2xl h-40 bg-gradient-to-r from-blue-200 via-blue-300 to-orange-300 flex items-center justify-center text-blue-800 font-medium">
        APIS — Auto Parts Inventory System
      </div>

      {/* Footer row */}
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">AI-powered platform by ANLU... 🥰🥰🥰</div>
        <button onClick={() => selectBranch('admin')} className="bg-black text-white px-6 py-2 rounded-full font-medium">
          ADMIN
        </button>
      </div>

      {/* Announcements */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Announcements</h2>
            <button onClick={() => setShowForm(!showForm)} className="text-sm text-purple-600">{showForm ? 'Cancel' : '+ New'}</button>
          </div>
          {showForm && (
            <div className="mb-3">
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} />
              <button onClick={post} className="mt-2 bg-purple-600 text-white px-4 py-1 rounded text-sm">Post</button>
            </div>
          )}
          {announcements.length === 0 ? (
            <p className="text-gray-400 text-sm">No announcements</p>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="border-t py-2 text-sm">
                <div className="font-medium text-purple-700">{a.author}</div>
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
