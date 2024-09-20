/**
 * Firebaseの初期化と認証周りの処理を行う
 */
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  getAuth,
  signInWithPopup,
  type User,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VITE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_FIREBASE_APP_ID,
  measurementId: process.env.VITE_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// 認証周り
const auth = getAuth(app);

/**
 * firebaseの型定義など同じものをexportする
 */
export { GoogleAuthProvider, TwitterAuthProvider, User, UserCredential, auth, signInWithPopup };
