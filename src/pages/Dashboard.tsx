import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { api, getSession, clearSession, type Client } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const hasContra = (c: Client) =>
  !!c.contraindications?.trim() ||
  c.diabetes || c.varicose || c.fungus || c.ingrown_nail || c.circulation || c.oncology;

const Dashboard = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [profileOpen, setProfileOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    if (session.role === 'client') {
      navigate('/cabinet');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProfile = async () => {
    try {
      const p = await api.getProfile();
      setPName(p.full_name || '');
      setPPhone(p.phone || '');
      setProfileOpen(true);
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const saveProfile = async () => {
    try {
      await api.updateProfile({ full_name: pName, phone: pPhone });
      setProfileOpen(false);
      toast({ title: 'Сохранено', description: 'Профиль обновлён' });
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const load = async () => {
    try {
      setClients(await api.listClients());
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q),
    );
  }, [clients, search]);

  const addClient = async () => {
    if (!newName.trim()) return;
    try {
      await api.createClient({ full_name: newName, phone: newPhone, email: newEmail });
      setOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      load();
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const logout = () => {
    clearSession();
    navigate('/');
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('ru-RU') : null);
  const isOverdue = (d?: string) => d && new Date(d) < new Date(new Date().toDateString());

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="Footprints" size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-800" style={{ fontFamily: 'Unbounded, sans-serif' }}>ПодоКарта</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openProfile} className="text-gray-400 hover:text-primary">
              <Icon name="Settings" size={20} />
            </button>
            <button onClick={logout} className="text-gray-400 hover:text-primary">
              <Icon name="LogOut" size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Мои клиенты</h1>

        <div className="relative mb-4">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или телефону"
            className="pl-10 bg-white"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Icon name="Users" size={40} className="mx-auto mb-3 opacity-40" />
            <p>Клиентов пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/client/${c.id}`)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{c.full_name}</span>
                      {hasContra(c) && <Icon name="TriangleAlert" size={16} className="text-amber-500" />}
                    </div>
                    {c.phone && <p className="text-sm text-gray-500 mt-0.5">{c.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {c.last_visit ? `Последний визит: ${fmtDate(c.last_visit)}` : 'Визитов ещё не было'}
                    </p>
                  </div>
                  {isOverdue(c.next_visit_date) && (
                    <span className="shrink-0 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                      Пора на приём
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 sm:right-[calc(50%-22rem)] w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Icon name="Plus" size={28} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cn">ФИО</Label>
              <Input id="cn" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Иванова Анна" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cp">Телефон</Label>
              <Input id="cp" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+7 900 000-00-00" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ce">Email клиента</Label>
              <Input id="ce" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="client@mail.ru" className="mt-1" />
              <p className="text-xs text-gray-400 mt-1">Если клиент зарегистрируется с этим email — он увидит свою карту в личном кабинете</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addClient}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Профиль мастера</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="pn">Имя мастера</Label>
              <Input id="pn" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Анна Петрова" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pp">Телефон (WhatsApp)</Label>
              <Input id="pp" value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="+7 900 000-00-00" className="mt-1" />
              <p className="text-xs text-gray-400 mt-1">Этот номер увидят клиенты в кнопке «Написать мастеру»</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveProfile}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;