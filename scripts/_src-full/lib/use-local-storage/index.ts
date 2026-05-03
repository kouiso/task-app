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
    } catch (err) {
      console.warn('localStorage読み込み失敗:', err);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serializer(state));
      }
    } catch (err) {
      // localStorage容量超過等の書き込み失敗時はReact stateのみで動作を継続
      console.warn('localStorage書き込み失敗:', err);
    }
  }, [key, state, serializer]);

  const isFunction = (v: T | ((val: T) => T)): v is (val: T) => T => typeof v === 'function';

  const setStoredValue = (valOrFunc: T | ((val: T) => T)) => {
    setState((prevState) => {
      return isFunction(valOrFunc) ? valOrFunc(prevState) : valOrFunc;
    });
  };

  return [state, setStoredValue];
}
