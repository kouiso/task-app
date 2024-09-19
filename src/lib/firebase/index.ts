/**
 * Firebaseの初期化と認証周りの処理を行う
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  type User,
  type UserCredential,
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// 認証周り
const auth = getAuth(app);

/**
 * firebaseの型定義など同じものをexportする
 */
export { auth, User, UserCredential, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup };
