import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import VisitForm from '@/components/VisitForm';
import { api, getSession, type Visit } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const VisitDetail = () => {
  const { id, visitId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const readOnly = session?.role !== 'master';
  const [params] = useSearchParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const cid = Number(id);
  const vid = Number(visitId);

  const load = async () => {
    setVisit(await api.getVisit(vid));
  };

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const v = await api.getVisit(vid);
        setVisit(v);
        if (params.get('edit') === '1' && session.role === 'master') setEditOpen(true);
      } catch (err) {
        toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveEdit = async (data: Partial<Visit>) => {
    try {
      await api.updateVisit({ ...data, id: vid, client_id: cid });
      await load();
      setEditOpen(false);
      toast({ title: 'Сохранено', description: 'Визит обновлён' });
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    }
  };

  if (!visit) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка…</div>;

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
  const fmtDT = () =>
    visit.visit_at
      ? new Date(visit.visit_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : fmt(visit.visit_date);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(`/client/${cid}`)} className="text-gray-500 hover:text-primary">
            <Icon name="ArrowLeft" size={22} />
          </button>
          <h1 className="font-semibold text-gray-800">Визит {fmtDT()}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <Row label="Дата и время" value={fmtDT()} />
          <Row label="Продолжительность" value={visit.duration_minutes ? `${visit.duration_minutes} мин` : '—'} />
          <Row label="Процедуры" value={visit.procedure} multiline />
          <Row label="Использованные средства и инструменты" value={visit.materials} multiline />
          <Row label="Описание результата" value={visit.result} multiline />
          <Row label="Рекомендации клиенту" value={visit.recommendations} multiline highlight />
          <Row label="Дата следующего визита" value={fmt(visit.next_visit_date)} />
          <Row label="Стоимость" value={visit.price != null ? `${Number(visit.price).toLocaleString('ru-RU')} ₽` : '—'} />
        </div>

        <div className="bg-white rounded-2xl p-5">
          <p className="font-semibold text-gray-700 mb-2">Фотографии</p>
          <p className="text-sm text-gray-400">Фото будут добавлены позже</p>
        </div>

        {!readOnly && (
          <Button onClick={() => setEditOpen(true)} className="w-full">
            <Icon name="Pencil" size={16} className="mr-1" /> Редактировать
          </Button>
        )}
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать визит</DialogTitle>
          </DialogHeader>
          <VisitForm initial={visit} onSave={saveEdit} saveLabel="Сохранить изменения" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value, multiline, highlight }: { label: string; value?: string; multiline?: boolean; highlight?: boolean }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</p>
    <p className={`${multiline ? 'whitespace-pre-wrap' : ''} ${highlight ? 'text-primary font-medium' : 'text-gray-800'}`}>
      {value?.trim() ? value : '—'}
    </p>
  </div>
);

export default VisitDetail;
