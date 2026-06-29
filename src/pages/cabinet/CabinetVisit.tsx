import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import ClientLayout from '@/components/ClientLayout';
import Lightbox from '@/components/Lightbox';
import { useCabinet } from '@/hooks/useCabinet';
import { type Visit, type Photo } from '@/lib/api';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
const fmtDT = (v: Visit) =>
  v.visit_at
    ? new Date(v.visit_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : fmt(v.visit_date);

const Slot = ({ photo, label, onOpen }: { photo?: Photo; label: string; onOpen: (u: string) => void }) => (
  <div>
    {photo ? (
      <img src={photo.url} alt="" onClick={() => onOpen(photo.url)} className="w-full aspect-square object-cover rounded-xl cursor-pointer" />
    ) : (
      <div className="w-full aspect-square rounded-xl bg-white/60 flex items-center justify-center text-gray-300 text-sm">нет фото</div>
    )}
    <p className="text-center text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const CabinetVisit = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useCabinet();
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (loading) return <ClientLayout><p className="text-center text-gray-400 py-10">Загрузка…</p></ClientLayout>;

  const visit = (data?.visits || []).find((v) => v.id === Number(visitId));
  if (!visit) return <ClientLayout><p className="text-center text-gray-400 py-10">Визит не найден</p></ClientLayout>;

  const photos = (data?.photos || []).filter((p) => p.visit_id === visit.id);
  const before = photos.filter((p) => p.photo_type === 'before');
  const after = photos.filter((p) => p.photo_type === 'after');
  const pairs = Math.max(before.length, after.length);

  return (
    <ClientLayout masterName={data?.master?.full_name}>
      <button onClick={() => navigate('/cabinet')} className="flex items-center gap-1 text-gray-500 hover:text-primary mb-4">
        <Icon name="ArrowLeft" size={20} /> Назад
      </button>

      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Unbounded, sans-serif' }}>{fmtDT(visit)}</h1>
        {visit.procedure && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Процедуры</p>
            <p className="text-gray-700 whitespace-pre-wrap">{visit.procedure}</p>
          </div>
        )}
        {visit.recommendations?.trim() && (
          <div className="bg-[#fdf2f2] rounded-xl p-3 border-l-4 border-primary">
            <p className="text-xs uppercase tracking-wide text-primary/80 mb-1">Рекомендации мастера</p>
            <p className="text-gray-700 whitespace-pre-wrap">{visit.recommendations}</p>
          </div>
        )}
        {visit.next_visit_date && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Следующий визит</p>
            <p className="text-gray-700">{fmt(visit.next_visit_date)}</p>
          </div>
        )}
      </div>

      {pairs > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm mt-4">
          <p className="font-semibold text-gray-700 mb-3">Фото до / после</p>
          <div className="space-y-3">
            {Array.from({ length: pairs }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Slot photo={before[i]} label="До" onOpen={setLightbox} />
                <Slot photo={after[i]} label="После" onOpen={setLightbox} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </ClientLayout>
  );
};

export default CabinetVisit;
