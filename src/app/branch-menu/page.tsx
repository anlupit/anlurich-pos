'use client';
import { useEffect } from 'react';

export default function BranchMenu() {
  useEffect(() => {
    const id = localStorage.getItem('anlurich-branch');
    window.location.href = id && id !== 'admin' ? `/branch/${id}` : id === 'admin' ? '/admin' : '/';
  }, []);
  return <div className="p-4">Going back to dashboard...</div>;
}
