'use client';

export default function IphoneApp() {
  return (
    <div className="min-h-screen p-4" style={{ background: '#f4f6fb' }}>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-5 text-center">
        <img src="/favicon.png" alt="Anlurich" className="w-20 h-20 mx-auto rounded-2xl mb-3" />
        <h1 className="text-2xl font-black text-[#1e3a8a] mb-2">Anlurich APP</h1>
        <p className="mb-4">iPhone and iPad install. Apple does not allow a direct file install like Android.</p>
        <ol className="text-left space-y-2 mb-4">
          <li>1. Open this page in <strong>Safari</strong>.</li>
          <li>2. Tap the <strong>Share</strong> button.</li>
          <li>3. Tap <strong>Add to Home Screen</strong>.</li>
          <li>4. Tap <strong>Add</strong>. The favicon becomes the icon.</li>
        </ol>
        <a href="/mobile" className="block bg-black text-white rounded-xl py-3 font-bold">Open Anlurich APP</a>
      </div>
    </div>
  );
}
