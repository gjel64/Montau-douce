// API : tous les appels au serveur

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const DEV_TOKEN = 'auth_token';


// formes des données échanger avec le server 
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

export interface MyInfos {
  user_name: string;
  user_tel: string;
  lat: number | null;
  lng: number | null;
  user_ics: string | null;
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

export const getMyInfos = (token: string) =>
  post<MyInfos>('/get_my_infos', { token });

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
): Promise<Ride[]> {
  const data = await post<{
    rides?: Array<{
      ride_id: number;
      user_name?: string;
      lat_start: number;
      lng_start: number;
      lat_end: number;
      lng_end: number;
    }>;
  }>('/get_possible_ride', { token });

  return (data.rides ?? []).map((ride) => ({
    ride_id: ride.ride_id,
    user_name: ride.user_name ?? `Trajet #${ride.ride_id}`,
    lat_start: Number(ride.lat_start),
    lng_start: Number(ride.lng_start),
    lat_end: Number(ride.lat_end),
    lng_end: Number(ride.lng_end),
    stops: [],
  }));
}

export const getRides = getPossibleRides;

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