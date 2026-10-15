import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { getRideInfos, RideInfos } from '../../services/api';
export default function SummaryRide() {
    const router = useRouter();
    const { rideId } = useLocalSearchParams();
    const { session } = useSession();

    const [rideData, setRideData] = useState<RideInfos | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRideData() {
        
            if (!rideId || !session?.token) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await getRideInfos(session.token, Number(rideId));
                setRideData(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur';
                Alert.alert('impossible de récupérer le trajet', message);
            } finally {
                setIsLoading(false);
            }
        }