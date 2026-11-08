'use client';

export default function GroupPage({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-yellow-600 mb-1">{title}</h1>
      <div className="text-xs text-gray-500 mb-6">Choose a form</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {items.map((item) => (
          <a key={item.href} href={item.href} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-5 py-6 text-center font-semibold shadow">
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
