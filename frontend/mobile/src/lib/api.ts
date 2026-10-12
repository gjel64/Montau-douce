// Remplace par l'IP locale de ton PC (ex: "http://192.168.1.XX:8000") si tu testes sur téléphone physique
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// Colle ici le token obtenu avec la commande curl sur /auth
export const DEV_TOKEN = "COLLE_TON_TOKEN_ICI";

// --- Types pour la structure Ride (compatibilité avec l'ancien front) ---
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

// --- Type renvoyé par ton nouveau backend (/get_possible_ride) ---
export interface UserPos {
  lat: number;
  lng: number;
}

/**
 * Récupère les positions des utilisateurs proches via /get_possible_ride
 */
export async function getPossibleRides(token: string = DEV_TOKEN): Promise<UserPos[]> {
  const res = await fetch(`${API_URL}/get_possible_ride`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Erreur API (${res.status}): ${text}`);
  }

  const data = await res.json();
  const rawList = data.users_pos ?? [];

  // Gère le cas où le backend renvoie "lng" OU la coquille "tel" pour la longitude
  return rawList.map((item: any) => ({
    lat: Number(item.lat),
    lng: Number(item.lng ?? item.tel),
  }));
}

/**
 * Adaptateur : si ton écran de carte appelle encore getRides() et attend des objets Ride[],
 * cette fonction appelle /get_possible_ride et convertit les points en format Ride
 * pour éviter que ton composant React Native ne plante.
 */
export async function getRides(token: string = DEV_TOKEN): Promise<Ride[]> {
  const positions = await getPossibleRides(token);

  return positions.map((pos, index) => ({
    ride_id: index + 1,
    user_name: `Utilisateur #${index + 1}`,
    lat_start: pos.lat,
    lng_start: pos.lng,
    lat_end: pos.lat,
    lng_end: pos.lng,
    stops: [],
  }));
}

/**
 * Authentification (/auth) -> renvoie { token, expires_at }
 */
export async function login(tel: string, passwd: string): Promise<{ token: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tel, passwd }),
  });

  if (!res.ok) {
    throw new Error(`Échec de connexion (${res.status})`);
  }

  return res.json();
}

/**
 * Création de compte (/create_user) -> renvoie { token, expires_at }
 */
export async function createUser(
  name: string,
  tel: string,
  passwd: string
): Promise<{ token: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/create_user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, tel, passwd }),
  });

  if (!res.ok) {
    throw new Error(`Échec de création de compte (${res.status})`);
  }

  return res.json();
}

/**
 * Mise à jour de la position (/fill_user_loc)
 */
export async function updateUserLocation(id: number | string, lat: number, lng: number): Promise<void> {
  const res = await fetch(`${API_URL}/fill_user_loc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: String(id),
      lat: String(lat),
      lng: String(lng),
    }),
  });

  if (!res.ok) {
    throw new Error(`Échec de mise à jour de la position (${res.status})`);
  }
}