import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { api, saveSession, getSession } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const goByRole = (role: string) => (role === 'client' ? '/cabinet' : '/dashboard');

const Index = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'master' | 'client'>('master');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) navigate(goByRole(s.role));
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, fullName, role);
      saveSession(res);
      navigate(goByRole(res.role));
    } catch (err) {
      toast({ title: 'Ошибка', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9e4e4] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Icon name="Footprints" size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Unbounded, sans-serif' }}>
            ПодоКарта
          </h1>
          <p className="text-sm text-gray-500 mt-1">CRM для мастера педикюра и подолога</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('master')}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${role === 'master' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground'}`}
                >
                  Я мастер
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${role === 'client' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground'}`}
                >
                  Я клиент
                </button>
              </div>
              <div>
                <Label htmlFor="name">Ваше имя</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={role === 'master' ? 'Имя мастера' : 'Ваше имя'} className="mt-1" />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.ru" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 text-base">
            {loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full text-center text-sm text-primary mt-6 hover:underline"
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
};

export default Index;