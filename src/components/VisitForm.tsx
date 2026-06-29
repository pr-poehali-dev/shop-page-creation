import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { api, type Visit, type Photo, type PhotoType } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { toast } from '@/components/ui/use-toast';

interface PendingPhoto {
  data: string;
  type: PhotoType;
}

interface Props {
  initial?: Partial<Visit>;
  clientId: number;
  onSave: (data: Partial<Visit>) => Promise<Visit>;
  saveLabel?: string;
}

const TYPE_LABELS: Record<PhotoType, string> = {
  before: 'До',
  after: 'После',
  process: 'Процесс',
};

const VisitForm = ({ initial, clientId, onSave, saveLabel = 'Сохранить визит' }: Props) => {
  const [visitAt, setVisitAt] = useState(initial?.visit_at ? initial.visit_at.slice(0, 16) : '');
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() || '');
  const [procedure, setProcedure] = useState(initial?.procedure || '');
  const [materials, setMaterials] = useState(initial?.materials || '');
  const [result, setResult] = useState(initial?.result || '');
  const [recommendations, setRecommendations] = useState(initial?.recommendations || '');
  const [nextDate, setNextDate] = useState(initial?.next_visit_date || '');
  const [price, setPrice] = useState(initial?.price?.toString() || '');
  const [saving, setSaving] = useState(false);

  const [existing, setExisting] = useState<Photo[]>([]);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (initial?.id) {
      api.listVisitPhotos(clientId, initial.id).then(setExisting).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = existing.length + pending.length;

  const pickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const slots = 10 - totalCount;
    if (slots <= 0) {
      toast({ title: 'Лимит', description: 'Не более 10 фото на визит', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const selected = files.slice(0, slots);
      const compressed = await Promise.all(selected.map((f) => compressImage(f)));
      setPending((p) => [...p, ...compressed.map((data) => ({ data, type: 'process' as PhotoType }))]);
    } finally {
      setProcessing(false);
    }
  };

  const setType = (idx: number, type: PhotoType) =>
    setPending((p) => p.map((ph, i) => (i === idx ? { ...ph, type } : ph)));

  const removePending = (idx: number) => setPending((p) => p.filter((_, i) => i !== idx));

  const submit = async () => {
    setSaving(true);
    try {
      const saved = await onSave({
        visit_at: visitAt || undefined,
        duration_minutes: duration ? Number(duration) : undefined,
        procedure,
        materials,
        result,
        recommendations,
        next_visit_date: nextDate || undefined,
        price: price ? Number(price) : undefined,
      });
      for (const ph of pending) {
        await api.uploadPhoto({ client_id: clientId, visit_id: saved.id, file_base64: ph.data, photo_type: ph.type });
      }
      setPending([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">Дата и время визита</Label>
          <Input type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">Продолжительность (мин)</Label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
        </div>
      </div>
      <div>
        <Label className="mb-1 block">Процедуры</Label>
        <Textarea value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="Медицинский педикюр, аппаратная обработка, обработка вросшего ногтя" />
      </div>
      <div>
        <Label className="mb-1 block">Использованные средства и инструменты</Label>
        <Textarea value={materials} onChange={(e) => setMaterials(e.target.value)} />
      </div>
      <div>
        <Label className="mb-1 block">Описание результата</Label>
        <Textarea value={result} onChange={(e) => setResult(e.target.value)} />
      </div>
      <div>
        <Label className="mb-1 block">Рекомендации клиенту</Label>
        <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Будет видно клиенту в его кабинете" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">Дата следующего визита</Label>
          <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">Стоимость, ₽</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2500" />
        </div>
      </div>

      {/* Фотографии визита */}
      <div>
        <Label className="mb-1 block">Фотографии визита ({totalCount}/10)</Label>

        {existing.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {existing.map((p) => (
              <div key={p.id} className="relative">
                <img src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {TYPE_LABELS[p.photo_type || 'process']}
                </span>
              </div>
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-2">
            {pending.map((ph, i) => (
              <div key={i} className="border rounded-lg p-2 space-y-2">
                <div className="relative">
                  <img src={ph.data} alt="" className="w-full aspect-square object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['before', 'after', 'process'] as PhotoType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(i, t)}
                      className={`text-xs py-1 rounded ${ph.type === t ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground'}`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalCount < 10 && (
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:border-primary transition-colors text-sm text-gray-500">
            {processing ? (
              <>
                <Icon name="Loader" size={18} className="animate-spin" /> Обработка…
              </>
            ) : (
              <>
                <Icon name="ImagePlus" size={18} /> Добавить фото
              </>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} disabled={processing} />
          </label>
        )}
      </div>

      <Button onClick={submit} disabled={saving || processing} className="w-full">
        {saving ? 'Сохранение…' : saveLabel}
      </Button>
    </div>
  );
};

export default VisitForm;
