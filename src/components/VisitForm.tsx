import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Visit } from '@/lib/api';

interface Props {
  initial?: Partial<Visit>;
  onSave: (data: Partial<Visit>) => Promise<void>;
  saveLabel?: string;
}

const VisitForm = ({ initial, onSave, saveLabel = 'Сохранить визит' }: Props) => {
  const [visitAt, setVisitAt] = useState(initial?.visit_at ? initial.visit_at.slice(0, 16) : '');
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() || '');
  const [procedure, setProcedure] = useState(initial?.procedure || '');
  const [materials, setMaterials] = useState(initial?.materials || '');
  const [result, setResult] = useState(initial?.result || '');
  const [recommendations, setRecommendations] = useState(initial?.recommendations || '');
  const [nextDate, setNextDate] = useState(initial?.next_visit_date || '');
  const [price, setPrice] = useState(initial?.price?.toString() || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        visit_at: visitAt || undefined,
        duration_minutes: duration ? Number(duration) : undefined,
        procedure,
        materials,
        result,
        recommendations,
        next_visit_date: nextDate || undefined,
        price: price ? Number(price) : undefined,
      });
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
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? 'Сохранение…' : saveLabel}
      </Button>
    </div>
  );
};

export default VisitForm;
