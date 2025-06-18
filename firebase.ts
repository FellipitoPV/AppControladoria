import { getApp, getApps, initializeApp } from 'firebase/app';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth } from 'firebase/auth';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD3iKMNBoyInCpQdi9UqEfqgqZs2x0rxUk",
  authDomain: "ecologikadashboard.firebaseapp.com",
  projectId: "ecologikadashboard",
  storageBucket: "ecologikadashboard.appspot.com",
  messagingSenderId: "708827138368",
  appId: "1:708827138368:web:06c325754f6140e67252a5",
};

// Inicializa o app Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa os serviços
export const authInstance = initializeAuth(app);
export const dbInstance = getFirestore(app);
export const dbRealTimeInstance = getDatabase(app);
export const dbStorageInstance = getStorage(app);

// Funções de exportação com verificação
export const auth = () => {
  if (!authInstance) throw new Error('Firebase Auth não está inicializado');
  return authInstance;
};

export const db = () => {
  if (!dbInstance) throw new Error('Firebase Firestore não está inicializado');
  return dbInstance;
};

export const dbRealTime = () => {
  if (!dbRealTimeInstance) throw new Error('Firebase Realtime Database não está inicializado');
  return dbRealTimeInstance;
};

export const dbStorage = () => {
  if (!dbStorageInstance) throw new Error('Firebase Storage não está inicializado');
  return dbStorageInstance;
};

export const firebaseApp = () => {
  if (!app) throw new Error('Firebase App não está inicializado');
  return app;
};