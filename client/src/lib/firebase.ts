// ============================================
// Controle de Extras — Configuração Firebase
// ============================================
// INSTRUÇÕES: substitua os valores abaixo pelas credenciais do
// SEU projeto Firebase (Console > Configurações do projeto > Seus apps).
// Veja o guia GUIA-DEPLOY.md na raiz do projeto.
// ============================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "COLE_SUA_API_KEY_AQUI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "seu-projeto.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "seu-projeto-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "seu-projeto.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000:web:000",
};

export const firebaseConfigurado =
  !!import.meta.env.VITE_FIREBASE_API_KEY ||
  (firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI" &&
    firebaseConfig.projectId !== "seu-projeto-id");

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
