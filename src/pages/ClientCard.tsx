import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import VisitForm from '@/components/VisitForm';
import { api, getSession, type Client, type Visit, type Photo } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const CONDITIONS: { key: keyof Client; label: string }[] = [
  { key: 'diabetes', label: 'Сахарный диабет' },
  { key: 'varicose', label: 'Варикозное расширение вен' },
  { key: 'fungus', label: 'Грибковое поражение ногтей/кожи' },
  { key: 'ingrown_nail', label: 'Вросший ноготь' },
  { key: 'circulation', label: 'Нарушение кровообращения' },
  { key: 'oncology', label: 'Онкология (в стадии лечения)' },
];

const ClientCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const readOnly = session?.role !== 'master';
  const [client, setClient] = useState<Client | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);

  const [visitOpen, setVisitOpen] = useState(false);

  const cid = Number(id);

  const reload = async () => {
    setClient(await api.getClient(cid));
    setVisits(await api.listVisits(cid));
  };

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        setClient(await api.getClient(cid));
        setVisits(await api.listVisits(cid));
        setPhotos(await api.listPhotos(cid));
      } catch (err) {
        toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Client>) => setClient((c) => (c ? { ...c, ...patch } : c));

  const save = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const updated = await api.updateClient({ ...client, id: cid });
      setClient(updated);
      toast({ title: 'Сохранено', description: 'Анамнез обновлён' });
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addVisit = async (data: Partial<Visit>) => {
    try {
      await api.createVisit({ ...data, client_id: cid });
      await reload();
      setVisitOpen(false);
      toast({ title: 'Сохранено', description: 'Визит добавлен' });
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.uploadPhoto(cid, reader.result as string);
        setPhotos(await api.listPhotos(cid));
      } catch (err) {
        toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!client) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка…</div>;

  const showBanner = !!client.contraindications?.trim() || CONDITIONS.some((c) => client[c.key]);
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : '');
  const fmtDT = (v: Visit) =>
    v.visit_at
      ? new Date(v.visit_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : fmt(v.visit_date);
  const fmtPrice = (p?: number) => (p != null ? `${Number(p).toLocaleString('ru-RU')} ₽` : '');

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-primary">
            <Icon name="ArrowLeft" size={22} />
          </button>
          <h1 className="font-semibold text-gray-800 truncate">{client.full_name}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {showBanner && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3">
            <Icon name="TriangleAlert" size={22} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Внимание: есть противопоказания</p>
              {client.contraindications?.trim() && (
                <p className="text-sm text-red-600 mt-1">{client.contraindications}</p>
              )}
            </div>
          </div>
        )}

        <Tabs defaultValue="anamnez">
          <TabsList className="w-full grid grid-cols-3 mb-5">
            <TabsTrigger value="anamnez">Анамнез</TabsTrigger>
            <TabsTrigger value="visits">Визиты</TabsTrigger>
            <TabsTrigger value="photos">Фото</TabsTrigger>
          </TabsList>

          <TabsContent value="anamnez">
            <div className="bg-white rounded-2xl p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ФИО"><Input disabled={readOnly} value={client.full_name || ''} onChange={(e) => set({ full_name: e.target.value })} /></Field>
                <Field label="Телефон"><Input disabled={readOnly} value={client.phone || ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
                <Field label="Email"><Input disabled={readOnly} value={client.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>
                <Field label="Дата рождения"><Input disabled={readOnly} type="date" value={client.birth_date || ''} onChange={(e) => set({ birth_date: e.target.value })} /></Field>
                <Field label="Рекомендуемая дата следующего визита"><Input disabled={readOnly} type="date" value={client.next_visit_date || ''} onChange={(e) => set({ next_visit_date: e.target.value })} /></Field>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-2">Медицинский анамнез</p>
                <div className="space-y-2">
                  {CONDITIONS.map((c) => (
                    <label key={c.key} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        disabled={readOnly}
                        checked={!!client[c.key]}
                        onCheckedChange={(v) => set({ [c.key]: !!v } as Partial<Client>)}
                      />
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Тип проблемной кожи / мозолей"><Textarea disabled={readOnly} value={client.skin_type || ''} onChange={(e) => set({ skin_type: e.target.value })} /></Field>
              <Field label="Аллергические реакции"><Textarea disabled={readOnly} value={client.allergies || ''} onChange={(e) => set({ allergies: e.target.value })} /></Field>
              <Field label="Противопоказания и особые условия"><Textarea disabled={readOnly} value={client.contraindications || ''} onChange={(e) => set({ contraindications: e.target.value })} /></Field>
              <Field label="Общие заметки о клиенте"><Textarea disabled={readOnly} value={client.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>

              {!readOnly && (
                <Button onClick={save} disabled={saving} className="w-full">
                  {saving ? 'Сохранение…' : 'Сохранить анамнез'}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="visits">
            {!readOnly && (
              <Button onClick={() => setVisitOpen(true)} className="w-full mb-4">
                <Icon name="Plus" size={18} className="mr-1" /> Добавить визит
              </Button>
            )}
            <div className="space-y-3">
              {visits.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Визитов пока нет</p>
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="bg-white rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800">{fmtDT(v)}</p>
                      {v.price != null && <span className="text-primary font-semibold whitespace-nowrap">{fmtPrice(v.price)}</span>}
                    </div>
                    {v.procedure && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{v.procedure}</p>}
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/client/${cid}/visit/${v.id}`)}>
                        Подробнее
                      </Button>
                      {!readOnly && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/client/${cid}/visit/${v.id}?edit=1`)}>
                          <Icon name="Pencil" size={15} className="mr-1" /> Редактировать
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Новый визит</DialogTitle>
                </DialogHeader>
                <VisitForm onSave={addVisit} />
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="photos">
            {!readOnly && (
              <label className="block bg-white rounded-2xl p-6 mb-4 text-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary transition-colors">
                <Icon name="Camera" size={28} className="mx-auto text-primary mb-2" />
                <span className="text-sm text-gray-500">Загрузить фото</span>
                <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
              </label>
            )}
            {photos.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Фото пока нет</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover rounded-2xl" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1 block">{label}</Label>
    {children}
  </div>
);

export default ClientCard;