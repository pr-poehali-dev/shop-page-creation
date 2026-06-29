import { useState } from 'react';
import Icon from '@/components/ui/icon';
import ClientLayout from '@/components/ClientLayout';
import Lightbox from '@/components/Lightbox';
import { useCabinet } from '@/hooks/useCabinet';
import { type Visit, type Photo } from '@/lib/api';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '');
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

const MyPhotos = () => {
  const { data, loading } = useCabinet();
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (loading) return <ClientLayout><p className="text-center text-gray-400 py-10">Загрузка…</p></ClientLayout>;

  const visits = data?.visits || [];
  const photos = (data?.photos || []).filter((p) => p.photo_type === 'before' || p.photo_type === 'after');
  const groups = visits
    .map((v) => ({ visit: v, items: photos.filter((p) => p.visit_id === v.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <ClientLayout masterName={data?.master?.full_name}>
      <h1 className="text-2xl font-bold text-gray-800 mb-5" style={{ fontFamily: 'Unbounded, sans-serif' }}>
        Мои фото
      </h1>

      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center mt-6">
          <Icon name="Images" size={40} className="mx-auto text-primary mb-3" />
          <p className="text-gray-500">Фото «До» и «После» пока нет</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ visit, items }) => {
            const before = items.filter((p) => p.photo_type === 'before');
            const after = items.filter((p) => p.photo_type === 'after');
            const pairs = Math.max(before.length, after.length);
            return (
              <div key={visit.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="space-y-3">
                  {Array.from({ length: pairs }).map((_, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Slot photo={before[i]} label="До" onOpen={setLightbox} />
                      <Slot photo={after[i]} label="После" onOpen={setLightbox} />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  <span className="font-medium text-gray-700">{fmtDT(visit)}</span>
                  {visit.procedure && ` — ${visit.procedure}`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </ClientLayout>
  );
};

export default MyPhotos;
