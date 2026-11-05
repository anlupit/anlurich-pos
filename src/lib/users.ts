export type UserAccount = {
  id: string;
  branch: string;
  name: string;
  password: string;
};

export const BRANCH_OPTIONS = [
  { id: 'anlurich', name: 'ANLURICH OPC' },
  { id: 'dasma', name: 'Dasma Auto Parts' },
  { id: 'lipa', name: 'Lipa Auto Parts' },
  { id: 'sezan', name: 'Sezan Baliwag Auto Parts' },
  { id: 'timitsu', name: 'Timitsu Baliwag Auto Parts' },
  { id: 'avenders', name: 'Avenders Auto Parts' },
  { id: 'admin', name: 'ADMIN' },
];

const DEFAULT_USERS: UserAccount[] = [
  { id: 'anlurich-1', branch: 'anlurich', name: 'User 1', password: 'Apples!' },
  { id: 'dasma-1', branch: 'dasma', name: 'User 1', password: 'Grapes!' },
  { id: 'lipa-1', branch: 'lipa', name: 'User 1', password: 'Oranges!' },
  { id: 'sezan-1', branch: 'sezan', name: 'User 1', password: 'Mangoes!' },
  { id: 'timitsu-1', branch: 'timitsu', name: 'User 1', password: 'Avocado!' },
  { id: 'avenders-1', branch: 'avenders', name: 'User 1', password: 'Thor!' },
  { id: 'admin-1', branch: 'admin', name: 'Anlupit', password: 'Guitar88!' },
];

export async function loadUsers(): Promise<UserAccount[]> {
  try {
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_USERS;
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export async function saveUsers(users: UserAccount[]) {
  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users),
  });
}
