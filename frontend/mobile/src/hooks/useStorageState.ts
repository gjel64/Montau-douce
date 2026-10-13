import { useCallback, useEffect, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type StorageState<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null]
): StorageState<T> {
  return useReducer(
    (_state: [boolean, T | null], value: T | null = null): [boolean, T | null] =>
      [false, value],
    initialValue
  ) as StorageState<T>;
}

export async function setStorageItemAsync(
  key: string,
  value: string | null
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Local storage is unavailable:', error);
    }
    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export function useStorageState(key: string): StorageState<string> {
  const [[isLoading, value], setState] = useAsyncState<string>();

  useEffect(() => {
    let isActive = true;

    async function loadValue() {
      try {
        const storedValue =
          Platform.OS === 'web'
            ? typeof localStorage === 'undefined'
              ? null
              : localStorage.getItem(key)
            : await SecureStore.getItemAsync(key);

        if (isActive) setState(storedValue);
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

  const setValue = useCallback(
    (nextValue: string | null) => {
      setState(nextValue);
      void setStorageItemAsync(key, nextValue).catch((error: unknown) => {
        console.error('Could not write stored value:', error);
      });
    },
    [key]
  );

  return [[isLoading, value], setValue];
}