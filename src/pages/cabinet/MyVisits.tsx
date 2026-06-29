import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import ClientLayout from '@/components/ClientLayout';
import { Button } from '@/components/ui/button';
import { useCabinet } from '@/hooks/useCabinet';
import { getSession, type Visit } from '@/lib/api';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '');
const fmtDT = (v: Visit) =>
  v.visit_at
    ? new Date(v.visit_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : fmt(v.visit_date);

const waLink = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
};

const MyVisits = () => {
  const navigate = useNavigate();
  const { data, loading } = useCabinet();
  const name = getSession()?.full_name || '';

  if (loading) return <ClientLayout><p className="text-center text-gray-400 py-10">Загрузка…</p></ClientLayout>;

  if (!data?.linked) {
    return (
      <ClientLayout>
        <div className="bg-white rounded-3xl p-8 text-center mt-6">
          <Icon name="Clock" size={40} className="mx-auto text-primary mb-3" />
          <p className="font-semibold text-gray-800">Ваша карта ещё не привязана</p>
          <p className="text-sm text-gray-500 mt-2">Как только мастер добавит вас по вашему email, здесь появятся ваши визиты, фото и рекомендации.</p>
        </div>
      </ClientLayout>
    );
  }

  const visits = data.visits || [];
  const nextDate = data.client?.next_visit_date;
  const overdue = nextDate && new Date(nextDate) < new Date(new Date().toDateString());
  const wa = waLink(data.master?.phone);

  return (
    <ClientLayout masterName={data.master?.full_name}>
      <h1 className="text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Unbounded, sans-serif' }}>
        Привет, {name}! 👋
      </h1>

      <div className="bg-white rounded-3xl p-5 shadow-sm mb-6">
        <p className="text-xs uppercase tracking-wide text-primary/70 mb-1">Следующий визит</p>
        {nextDate ? (
          <p className="text-lg font-semibold text-gray-800">{fmt(nextDate)}</p>
        ) : (
          <p className="text-gray-500">Дата пока не назначена</p>
        )}
        {overdue && (
          <p className="text-sm text-red-500 mt-2 font-medium">Пора записаться! Свяжитесь с мастером</p>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="block mt-4">
            <Button className="w-full gap-2">
              <Icon name="MessageCircle" size={18} /> Написать мастеру
            </Button>
          </a>
        )}
      </div>

      <h2 className="font-semibold text-gray-700 mb-3">История визитов</h2>
      {visits.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Визитов пока нет</p>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <button
              key={v.id}
              onClick={() => navigate(`/cabinet/visit/${v.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-800">{fmtDT(v)}</p>
              {v.procedure && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{v.procedure}</p>}
              {v.recommendations?.trim() && (
                <p className="text-sm text-primary mt-2 flex items-start gap-1">
                  <Icon name="Sparkles" size={15} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{v.recommendations}</span>
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </ClientLayout>
  );
};

export default MyVisits;
