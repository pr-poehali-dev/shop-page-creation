import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSession, type ClientCabinet } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export function useCabinet() {
  const navigate = useNavigate();
  const [data, setData] = useState<ClientCabinet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate('/');
      return;
    }
    if (s.role !== 'client') {
      navigate('/dashboard');
      return;
    }
    api
      .getMyCabinet()
      .then(setData)
      .catch((err) => toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}
