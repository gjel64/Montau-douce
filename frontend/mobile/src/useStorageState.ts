import  { useEffect, useCallback, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Local storage is unavailable:', e);
    }
  } else {
    if (value == null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

export function useStorageState(key: string): UseStateHook<string> {
  // Public
  const [state, setState] = useAsyncState<string>();

  // Get
  useEffect(() => {
    let isActive = true;

    async function loadValue() {
      try {
        const value = Platform.OS === 'web'
          ? typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
          : await SecureStore.getItemAsync(key);
        if (isActive) setState(value);
      } catch (error) {
        console.error('Could not read stored value:', error);
        if (isActive) setState(null);
      }
    }

    void loadValue();
    return () => {
      isActive = false;
    };
  }, [key, setState]);

  // Set
  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      void setStorageItemAsync(key, value).catch((error: unknown) => {
        console.error('Could not write stored value:', error);
      });
    },
    [key]
  );

  return [state, setValue];
}

