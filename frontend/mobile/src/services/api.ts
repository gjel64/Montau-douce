export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const DEV_TOKEN = 'auth_token';

export interface Stop {
  ride_id: number;
  stop_order: number;
  lat: number;
  lng: number;
}

export interface Ride {
  ride_id: number;
  user_name: string;
  lat_start: number;
  lng_start: number;
  lat_end: number;
  lng_end: number;
  stops: Stop[];
}

export interface UserPos {
  lat: number;
  lng: number;
}

export interface CreateUserBody {
  name: string;
  tel: string;
  passwd: string;
}

export interface LoginBody {
  tel: string;
  passwd: string;
}

export interface SessionResponse {
  token: string;
  expires_at: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `Erreur API (${response.status})${details ? ` : ${details}` : ''}`
    );
  }

  return response.json() as Promise<T>;
}

export const loginUser = (body: LoginBody) =>
  post<SessionResponse>('/auth', body);

export const login = (tel: string, passwd: string) =>
  loginUser({ tel, passwd });

export function createUser(body: CreateUserBody): Promise<SessionResponse>;
export function createUser(
  name: string,
  tel: string,
  passwd: string
): Promise<SessionResponse>;
export function createUser(
  bodyOrName: CreateUserBody | string,
  tel?: string,
  passwd?: string
): Promise<SessionResponse> {
  const body =
    typeof bodyOrName === 'string'
      ? { name: bodyOrName, tel: tel ?? '', passwd: passwd ?? '' }
      : bodyOrName;

  return post<SessionResponse>('/create_user', body);
}

export async function getPossibleRides(
  token: string = DEV_TOKEN
): Promise<UserPos[]> {
  const data = await post<{
    users_pos?: Array<{
      lat: number | string;
      lng?: number | string;
      tel?: number | string;
    }>;
  }>('/get_possible_ride', { token });

  return (data.users_pos ?? []).map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lng ?? item.tel),
  }));
}

export async function getRides(token: string = DEV_TOKEN): Promise<Ride[]> {
  const positions = await getPossibleRides(token);

  return positions.map((position, index) => ({
    ride_id: index + 1,
    user_name: `Utilisateur #${index + 1}`,
    lat_start: position.lat,
    lng_start: position.lng,
    lat_end: position.lat,
    lng_end: position.lng,
    stops: [],
  }));
}

export async function updateUserLocation(
  token: string,
  lat: number,
  lng: number
): Promise<void> {
  await post<{ result: string }>('/fill_user_loc', {
    token,
    lat,
    lng,
  });

}

export interface RideInfosStop {
  stop_id: number;
  stop_lat: number;
  stop_lng: number;
  status: string;
  stop_order: number;
  user_id: number;
}

export interface RideInfos {
  ride_id: number;
  ride_start: string;
  ride_goal_time: string;
  lat_start: number;
  lng_start: number;
  lat_end: number;
  lng_end: number;
  type: string;
  stops: RideInfosStop[];
}

export async function getRideInfos(token: string, ride_id: number): Promise<RideInfos> {
  const data = await post<{ ride_infos: RideInfos }>('/get_ride_infos', {
    token,
    ride_id,
  });

  return data.ride_infos;
}