import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import ClientNav from '@/components/ClientNav';
import { clearSession } from '@/lib/api';

interface Props {
  children: ReactNode;
  masterName?: string;
}

const ClientLayout = ({ children, masterName }: Props) => {
  const navigate = useNavigate();
  const logout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf2f2] to-[#f9e4e4]">
      <header className="bg-white/80 backdrop-blur border-b border-[#f0d9d9] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#f9e4e4] border border-dashed border-primary/40 flex items-center justify-center text-[8px] text-primary text-center leading-tight">
              Ваш<br />логотип
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Unbounded, sans-serif' }}>
                {masterName || 'Мастер'}
              </p>
              <p className="text-[11px] text-gray-400">личный кабинет</p>
            </div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-primary">
            <Icon name="LogOut" size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">{children}</main>

      <ClientNav />
    </div>
  );
};

export default ClientLayout;
