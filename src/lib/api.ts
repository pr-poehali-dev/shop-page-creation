const AUTH_URL = 'https://functions.poehali.dev/3715e975-f8cd-4b60-9578-9f5165c0057f';
const CLIENTS_URL = 'https://functions.poehali.dev/94b6badd-20ae-46c9-b8a3-af0a9a570d49';

export interface Client {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  diabetes?: boolean;
  varicose?: boolean;
  fungus?: boolean;
  ingrown_nail?: boolean;
  circulation?: boolean;
  oncology?: boolean;
  skin_type?: string;
  allergies?: string;
  contraindications?: string;
  notes?: string;
  next_visit_date?: string;
  last_visit?: string;
}

export interface Visit {
  id: number;
  client_id: number;
  visit_date: string;
  visit_at?: string;
  duration_minutes?: number;
  procedure?: string;
  materials?: string;
  result?: string;
  recommendations?: string;
  next_visit_date?: string;
  price?: number;
  notes?: string;
}

export type PhotoType = 'before' | 'after' | 'process';

export interface Photo {
  id: number;
  client_id: number;
  visit_id?: number;
  photo_type?: PhotoType;
  url: string;
  caption?: string;
  created_at?: string;
}

function getToken(): string {
  return localStorage.getItem('podo_token') || '';
}

async function req(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    req(AUTH_URL, { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) }),
  register: (email: string, password: string, full_name: string, role: string) =>
    req(AUTH_URL, { method: 'POST', body: JSON.stringify({ action: 'register', email, password, full_name, role }) }),

  listClients: (): Promise<Client[]> => req(`${CLIENTS_URL}?resource=clients`),
  getClient: (id: number): Promise<Client> => req(`${CLIENTS_URL}?resource=clients&id=${id}`),
  createClient: (data: Partial<Client>): Promise<Client> =>
    req(`${CLIENTS_URL}?resource=clients`, { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (data: Partial<Client> & { id: number }): Promise<Client> =>
    req(`${CLIENTS_URL}?resource=clients`, { method: 'PUT', body: JSON.stringify(data) }),

  listVisits: (client_id: number): Promise<Visit[]> => req(`${CLIENTS_URL}?resource=visits&client_id=${client_id}`),
  getVisit: (id: number): Promise<Visit> => req(`${CLIENTS_URL}?resource=visits&id=${id}`),
  createVisit: (data: Partial<Visit>): Promise<Visit> =>
    req(`${CLIENTS_URL}?resource=visits`, { method: 'POST', body: JSON.stringify(data) }),
  updateVisit: (data: Partial<Visit> & { id: number; client_id: number }): Promise<Visit> =>
    req(`${CLIENTS_URL}?resource=visits`, { method: 'PUT', body: JSON.stringify(data) }),

  listPhotos: (client_id: number): Promise<Photo[]> => req(`${CLIENTS_URL}?resource=photos&client_id=${client_id}`),
  listVisitPhotos: (client_id: number, visit_id: number): Promise<Photo[]> =>
    req(`${CLIENTS_URL}?resource=photos&client_id=${client_id}&visit_id=${visit_id}`),
  uploadPhoto: (data: { client_id: number; file_base64: string; visit_id?: number; photo_type?: PhotoType; caption?: string }): Promise<Photo> =>
    req(`${CLIENTS_URL}?resource=photos`, { method: 'POST', body: JSON.stringify(data) }),
};

export interface Session {
  token: string;
  role: string;
  user_id: number;
  full_name: string;
}

export function saveSession(s: Session) {
  localStorage.setItem('podo_token', s.token);
  localStorage.setItem('podo_session', JSON.stringify(s));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem('podo_session');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem('podo_token');
  localStorage.removeItem('podo_session');
}