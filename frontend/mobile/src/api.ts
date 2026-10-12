const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Erreur ${res.status}${details ? ` : ${details}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export type CreateUserBody = { name: string; tel: string; passwd: string };
export type LoginBody = { tel: string; passwd: string };
export type CreateUserResponse = { token: string; expires_at: string };

export const createUser = (body: CreateUserBody) =>
  post<CreateUserResponse>('/create_user', body);

export const loginUser = (body: LoginBody) =>
  post<CreateUserResponse>('/auth', body);