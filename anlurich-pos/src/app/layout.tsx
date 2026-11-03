import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'APIS — Auto-Parts Inventory System',
  description: 'Auto-Parts Inventory System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
