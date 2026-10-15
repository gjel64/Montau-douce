import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { getRideInfos, RideInfos } from '../../services/api';
export default function SummaryRide() {
    const router = useRouter();
    const { rideId } = useLocalSearchParams(); // recupere l id du trajet 
    const { session } = useSession();

    const [rideData, setRideData] = useState<RideInfos | null>(null); 
    const [isLoading, setIsLoading] = useState(true);

   // useEffect(() => {
     //   async function fetchRideData() {
          // if (!rideId || !session?.token) {
               // setIsLoading(false);
              //  return;
}