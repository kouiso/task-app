'use client';

import { useEffect, useState } from 'react';

type Options<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
};

export default function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: Options<T> = {},
): [T, (value: T | ((val: T) => T)) => void] {
  const { serializer = JSON.stringify, deserializer = JSON.parse } = options;
  const [state, setState] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? deserializer(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serializer(state));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, state, serializer]);

  const setStoredValue = (valOrFunc: T | ((val: T) => T)) => {
    setState((prevState) => {
      const newState = typeof valOrFunc === 'function' ? (valOrFunc as (val: T) => T)(prevState) : valOrFunc;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serializer(newState));
        }
      } catch (error) {
        console.error(error);
      }
      return newState;
    });
  };

  return [state, setStoredValue];
}
