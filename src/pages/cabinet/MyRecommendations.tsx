import Icon from '@/components/ui/icon';
import ClientLayout from '@/components/ClientLayout';
import { useCabinet } from '@/hooks/useCabinet';
import { type Visit } from '@/lib/api';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '');
const fmtDT = (v: Visit) =>
  v.visit_at
    ? new Date(v.visit_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : fmt(v.visit_date);

const MyRecommendations = () => {
  const { data, loading } = useCabinet();

  if (loading) return <ClientLayout><p className="text-center text-gray-400 py-10">Загрузка…</p></ClientLayout>;

  const recs = (data?.visits || []).filter((v) => v.recommendations?.trim());

  return (
    <ClientLayout masterName={data?.master?.full_name}>
      <h1 className="text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Unbounded, sans-serif' }}>
        Рекомендации
      </h1>

      {recs.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center mt-6">
          <Icon name="Sparkles" size={40} className="mx-auto text-primary mb-3" />
          <p className="text-gray-500">Рекомендаций пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recs.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-primary">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Icon name="Sparkles" size={18} />
                <span className="text-xs uppercase tracking-wide font-medium">{fmtDT(v)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{v.recommendations}</p>
              {v.procedure && <p className="text-xs text-gray-400 mt-3">{v.procedure}</p>}
            </div>
          ))}
        </div>
      )}
    </ClientLayout>
  );
};

export default MyRecommendations;
