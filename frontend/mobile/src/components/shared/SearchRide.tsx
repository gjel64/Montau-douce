import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import {
  ApiError,
  createStop,
  getMyInfos,
  getPossibleRides,
  getRideInfos,
  type Ride,
  type RideInfos,
} from '../../services/api';

// Coordonnées du Campus de Montaury (Anglet)
const CAMPUS_MONTAURY = {
  lat: '43.4793',
  lng: '-1.5146',
};

const RADIUS_OPTIONS = [300, 500, 1000, 2000];

const RIDE_TYPE_LABELS: Record<number, string> = {
  0: 'VOITURE',
  1: 'VÉLO',
  2: 'BUS',
  3: 'À PIED',
};

// Sur iOS, "numeric" n'a ni le "-" ni la virgule : on prend le clavier complet
const COORD_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Convertit une saisie ("43,47" ou "43.47") en nombre.
// Renvoie null si le champ est vide, invalide ou hors plage.
function parseCoord(value: string, min: number, max: number): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const n = Number(trimmed.replace(',', '.'));
  if (Number.isNaN(n) || n < min || n > max) return null;

  return n;
}

// Convertit "08:30" ou "08h30" (ou une date ISO) en date UTC ISO attendue par Rust
function toUtcIsoString(input: string): string | null {
  const trimmed = input.trim();
  const timeMatch = trimmed.match(/^(\d{1,2})[:hH](\d{2})$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const now = new Date();
      now.setHours(hours, minutes, 0, 0);
      return now.toISOString();
    }
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function SearchRide() {
  const router = useRouter();
  const { session, signOut } = useSession();

  const [latStart, setLatStart] = useState('');
  const [lngStart, setLngStart] = useState('');
  const [latEnd, setLatEnd] = useState(CAMPUS_MONTAURY.lat);
  const [lngEnd, setLngEnd] = useState(CAMPUS_MONTAURY.lng);
  const [arrivalTime, setArrivalTime] = useState('');
  const [radius, setRadius] = useState<number>(500);

  const [isSearching, setIsSearching] = useState(false);
  const [joiningRideId, setJoiningRideId] = useState<number | null>(null);
  const [requestedRideIds, setRequestedRideIds] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Array<{ ride: Ride; infos?: RideInfos }>>([]);

  // Au chargement : position GPS actuelle, sinon coordonnées enregistrées dans le profil
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          if (active) {
            setLatStart(loc.coords.latitude.toFixed(5));
            setLngStart(loc.coords.longitude.toFixed(5));
          }
          return;
        }
      } catch {
        // Fallback sur getMyInfos
      }

      if (session?.token) {
        getMyInfos(session.token)
          .then((infos) => {
            if (active && infos.lat !== null && infos.lng !== null) {
              setLatStart(String(infos.lat));
              setLngStart(String(infos.lng));
            }
          })
          .catch(() => {});
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.token]);

  async function handleUseCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission GPS refusée : active la localisation dans tes réglages.');
      return;
    }
    setError('');
    const loc = await Location.getCurrentPositionAsync({});
    setLatStart(loc.coords.latitude.toFixed(5));
    setLngStart(loc.coords.longitude.toFixed(5));
  }

  async function onSearch() {
    if (!session?.token) return;

    const latE = parseCoord(latEnd, -90, 90);
    const lngE = parseCoord(lngEnd, -180, 180);
    if (latE === null || lngE === null) {
      setError('Les coordonnées de destination sont invalides.');
      return;
    }

    const latS = latStart.trim() ? parseCoord(latStart, -90, 90) : undefined;
    const lngS = lngStart.trim() ? parseCoord(lngStart, -180, 180) : undefined;
    if (latS === null || lngS === null) {
      setError('Les coordonnées de départ sont invalides.');
      return;
    }

    let arrivalTimeIso: string | undefined;
    if (arrivalTime.trim()) {
      const converted = toUtcIsoString(arrivalTime);
      if (!converted) {
        setError('Heure d’arrivée invalide : utilise le format HH:MM (ex : 08:30).');
        return;
      }
      arrivalTimeIso = converted;
    }

    setError('');
    setIsSearching(true);
    setHasSearched(true);

    try {
      const rides = await getPossibleRides(session.token, {
        lat_end: latE,
        lng_end: lngE,
        radius,
        ...(latS !== undefined ? { lat_start: latS } : {}),
        ...(lngS !== undefined ? { lng_start: lngS } : {}),
        ...(arrivalTimeIso ? { arrival_time: arrivalTimeIso } : {}),
      });

      const detailedRides = await Promise.all(
        rides.map(async (ride) => {
          try {
            const infos = await getRideInfos(session.token!, ride.ride_id);
            return { ride, infos };
          } catch {
            return { ride };
          }
        })
      );

      setResults(detailedRides);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        signOut();
        router.replace('/sign-in');
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Impossible de rechercher des trajets.'
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function handleJoinRide(rideId: number, existingStopsCount: number) {
    if (!session?.token) return;

    const lat = parseCoord(latStart, -90, 90);
    const lng = parseCoord(lngStart, -180, 180);
    if (lat === null || lng === null) {
      setError('Renseigne un point de départ valide pour définir ton point de rendez-vous.');
      return;
    }

    setError('');
    setJoiningRideId(rideId);

    try {
      const { stop_id } = await createStop(session.token, {
        ride_id: rideId,
        stop_lat: lat,
        stop_lng: lng,
        stop_order: existingStopsCount + 1,
      });

      setRequestedRideIds((prev) => [...prev, rideId]);
      showAlert(
        'Demande envoyée',
        `Ta demande (#${stop_id}) pour rejoindre ce covoiturage a bien été envoyée au conducteur.`
      );
      router.push('/map');
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        signOut();
        router.replace('/sign-in');
        return;
      }
      const rawMessage =
        requestError instanceof Error ? requestError.message : 'Impossible de rejoindre ce trajet.';
      setError(
        rawMessage.includes('only be created for car rides')
          ? 'Tu ne peux envoyer une demande de covoiturage que sur un trajet en voiture.'
          : rawMessage
      );
    } finally {
      setJoiningRideId(null);
    }
  }

  const startLat = parseCoord(latStart, -90, 90);
  const startLng = parseCoord(lngStart, -180, 180);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.title}>Rechercher un trajet</Text>
        <View style={styles.rule} />
        <Text style={styles.description}>
          Trouve un compagnon de route autour de ton point de départ.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Point de départ (et lieu de prise en charge)</Text>
            <Pressable onPress={handleUseCurrentLocation}>
              <Text style={styles.linkText}>Ma position GPS</Text>
            </Pressable>
          </View>

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Latitude départ"
              placeholderTextColor="#8B9993"
              keyboardType={COORD_KEYBOARD}
              value={latStart}
              onChangeText={setLatStart}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Longitude départ"
              placeholderTextColor="#8B9993"
              keyboardType={COORD_KEYBOARD}
              value={lngStart}
              onChangeText={setLngStart}
            />
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Destination</Text>
            <Pressable
              onPress={() => {
                setLatEnd(CAMPUS_MONTAURY.lat);
                setLngEnd(CAMPUS_MONTAURY.lng);
              }}
            >
              <Text style={styles.linkText}>Campus Montaury</Text>
            </Pressable>
          </View>

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Latitude arrivée"
              placeholderTextColor="#8B9993"
              keyboardType={COORD_KEYBOARD}
              value={latEnd}
              onChangeText={setLatEnd}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Longitude arrivée"
              placeholderTextColor="#8B9993"
              keyboardType={COORD_KEYBOARD}
              value={lngEnd}
              onChangeText={setLngEnd}
            />
          </View>

          <Text style={styles.label}>Rayon autour du départ : {radius} m</Text>
          <View style={styles.radiusContainer}>
            {RADIUS_OPTIONS.map((option) => {
              const active = radius === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setRadius(option)}
                  style={[styles.radiusButton, active && styles.radiusButtonActive]}
                >
                  <Text style={[styles.radiusText, active && styles.radiusTextActive]}>
                    {option >= 1000 ? `${option / 1000} km` : `${option} m`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Heure d’arrivée (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : 08:30"
            placeholderTextColor="#8B9993"
            value={arrivalTime}
            onChangeText={setArrivalTime}
          />

          <Pressable
            accessibilityRole="button"
            onPress={onSearch}
            disabled={isSearching}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isSearching && styles.disabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSearching ? 'Recherche en cours...' : 'Rechercher'}
            </Text>
          </Pressable>
        </View>

        {isSearching ? <ActivityIndicator color="#17473E" /> : null}

        {!isSearching && hasSearched && results.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
            <Text style={styles.emptyText}>
              Essaie d’élargir le rayon de recherche (ex : 2 km) ou de modifier l’horaire.
            </Text>
          </View>
        ) : null}

        {!isSearching &&
          results.map(({ ride, infos }) => {
            const distanceMeters =
              startLat !== null && startLng !== null
                ? getDistanceMeters(startLat, startLng, ride.lat_start, ride.lng_start)
                : null;

            const isJoining = joiningRideId === ride.ride_id;
            const alreadyRequested = requestedRideIds.includes(ride.ride_id);
            const isCarRide = infos ? infos.type === 0 : true;
            const typeLabel =
              infos !== undefined ? RIDE_TYPE_LABELS[infos.type] ?? 'AUTRE' : null;

            return (
              <View key={ride.ride_id} style={styles.resultCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.driverName}>
                    {ride.user_name ?? `Trajet #${ride.ride_id}`}
                  </Text>
                  {typeLabel ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{typeLabel}</Text>
                    </View>
                  ) : null}
                </View>

                {infos ? (
                  <Text style={styles.infoLine}>
                    Départ : {formatTime(infos.ride_start)} • Arrivée prévue :{' '}
                    {formatTime(infos.ride_goal_time)}
                  </Text>
                ) : null}

                {ride.remaining_seats !== undefined ? (
                  <Text style={styles.infoLine}>
                    Places restantes : {ride.remaining_seats}
                  </Text>
                ) : null}

                {distanceMeters !== null ? (
                  <Text style={styles.distanceText}>
                    À environ {distanceMeters} m de ton point de départ
                  </Text>
                ) : null}

                <Text style={styles.coordsText}>
                  Départ : ({ride.lat_start.toFixed(4)}, {ride.lng_start.toFixed(4)})
                </Text>

                {infos ? (
                  <Text style={styles.coordsText}>
                    Demandes / arrêts : {infos.stops.length}
                  </Text>
                ) : null}

                {isCarRide ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleJoinRide(ride.ride_id, infos?.stops.length ?? 0)}
                    disabled={isJoining || alreadyRequested}
                    style={({ pressed }) => [
                      styles.joinButton,
                      pressed && styles.pressed,
                      (isJoining || alreadyRequested) && styles.disabled,
                    ]}
                  >
                    <Text style={styles.joinButtonText}>
                      {isJoining
                        ? 'Envoi de la demande...'
                        : alreadyRequested
                        ? 'Demande envoyée'
                        : 'Envoyer une demande'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.coordsText}>
                    Demande de covoiturage réservée aux trajets en voiture.
                  </Text>
                )}
              </View>
            );
          })}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Retour</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#F5F6F1',
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 14,
  },
  title: {
    color: '#17473E',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  rule: {
    width: 52,
    height: 3,
    backgroundColor: '#C45C3C',
    alignSelf: 'center',
  },
  description: {
    color: '#64736D',
    fontSize: 15,
    textAlign: 'center',
  },
  error: {
    color: '#A33D36',
    textAlign: 'center',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DDD7',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#1D302C',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  linkText: {
    color: '#C45C3C',
    fontSize: 13,
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#C9D0C8',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FAFBF9',
    color: '#1D302C',
    fontSize: 15,
  },
  radiusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9D0C8',
    borderRadius: 6,
    backgroundColor: '#FAFBF9',
  },
  radiusButtonActive: {
    backgroundColor: '#17473E',
    borderColor: '#17473E',
  },
  radiusText: {
    color: '#1D302C',
    fontSize: 14,
    fontWeight: '500',
  },
  radiusTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#17473E',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#17473E',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#17473E',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C45C3C',
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C45C3C',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64736D',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8DDD7',
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D302C',
  },
  badge: {
    backgroundColor: '#E7EFEA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#17473E',
    fontWeight: '700',
    fontSize: 12,
  },
  infoLine: {
    fontSize: 14,
    color: '#1D302C',
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 14,
    color: '#17473E',
    fontWeight: '600',
  },
  coordsText: {
    fontSize: 13,
    color: '#64736D',
  },
  joinButton: {
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#C45C3C',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});