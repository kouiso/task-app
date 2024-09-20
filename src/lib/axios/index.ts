import axios from 'axios';

import { auth } from '../firebase';

import type { AxiosRequestConfig } from 'axios';

interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void;
}

export const axiosInstance = axios.create({
  baseURL: process.env.VITE_APP_API_ENDPOINT,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await auth.currentUser?.getIdToken();
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.info('User is not logged in, sending request without token');
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const orvalAxiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): CancellablePromise<T> => {
  const source = axios.CancelToken.source();
  const promise: CancellablePromise<T> = axiosInstance({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data) as CancellablePromise<T>;

  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };
  return promise;
};
