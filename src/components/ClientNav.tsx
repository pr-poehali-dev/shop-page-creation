import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { toast } from '@/components/ui/use-toast';

const ITEMS = [
  { path: '/cabinet', label: 'Визиты', icon: 'CalendarHeart' },
  { path: '/cabinet/photos', label: 'Фото', icon: 'Images' },
  { path: '/cabinet/recommendations', label: 'Рекомендации', icon: 'Sparkles' },
];

const ClientNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#f0d9d9] z-20">
      <div className="max-w-2xl mx-auto grid grid-cols-4">
        {ITEMS.map((it) => {
          const active = pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => navigate(it.path)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}
            >
              <Icon name={it.icon} size={22} />
              {it.label}
            </button>
          );
        })}
        <button
          onClick={() => toast({ title: 'Скоро!', description: 'Приглашение подруги появится позже' })}
          className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-gray-400"
        >
          <Icon name="UserPlus" size={22} />
          Пригласить
        </button>
      </div>
    </nav>
  );
};

export default ClientNav;
