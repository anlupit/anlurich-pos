'use client';

import { useEffect, useState } from 'react';
import { BRANCH_OPTIONS, loadUsers, saveUsers, UserAccount } from '../../lib/users';

export default function UsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [branch, setBranch] = useState('anlurich');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('anlurich-auth') !== 'admin') {
      alert('Admin only');
      window.location.href = '/';
      return;
    }
    loadUsers().then(setUsers);
  }, []);

  const reset = () => {
    setBranch('anlurich');
    setName('');
    setPassword('');
    setEditingId(null);
  };

  const save = async () => {
    if (!name.trim() || !password.trim()) return alert('Login name and password are required');
    const next = editingId
      ? users.map((u) => (u.id === editingId ? { ...u, branch, name: name.trim(), password } : u))
      : [...users, { id: Date.now().toString(), branch, name: name.trim(), password }];
    setUsers(next);
    await saveUsers(next);
    reset();
  };

  const edit = (u: UserAccount) => {
    setEditingId(u.id);
    setBranch(u.branch);
    setName(u.name);
    setPassword(u.password);
  };

  const remove = async (u: UserAccount) => {
    if (!confirm(`Delete ${u.name} from ${u.branch}?`)) return;
    const next = users.filter((x) => x.id !== u.id);
    setUsers(next);
    await saveUsers(next);
  };

  return (
    <div className="p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">User and Password Manager</h1>
        <a href="/admin" className="text-blue-600 text-sm">Back to Admin</a>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <select className="border rounded px-3 py-2" value={branch} onChange={(e) => setBranch(e.target.value)}>
          {BRANCH_OPTIONS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className="border rounded px-3 py-2" placeholder="Login Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-purple-600 text-white rounded">{editingId ? 'Update' : 'Add User'}</button>
          {editingId && <button onClick={reset} className="px-3 bg-gray-400 text-white rounded">Cancel</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Branch</th>
              <th className="text-left p-3">Login Name</th>
              <th className="text-left p-3">Password</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{BRANCH_OPTIONS.find((b) => b.id === u.branch)?.name || u.branch}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.password}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => edit(u)} className="text-blue-600">Edit</button>
                  <button onClick={() => remove(u)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
