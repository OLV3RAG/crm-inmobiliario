import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingChatbot } from '@/components/chat/FloatingChatbot';

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen bg-[#0A0A0F] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0A0F] overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#0A0A0F] p-0">
          <Outlet />
        </main>
      </div>
      
      <FloatingChatbot />
    </div>
  );
}
