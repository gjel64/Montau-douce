import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
// import { getRideInfos, RideInfos } from '../../services/api';