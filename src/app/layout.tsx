import './globals.css';
import Sidebar from '../components/Sidebar';
import CloudSync from '../components/CloudSync';
import AuthGuard from '../components/AuthGuard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'APIS — Auto-Parts Inventory System',
  description: 'Auto-Parts Inventory System',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <CloudSync />
        <AuthGuard />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
