import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: "trailer-d5892.firebaseapp.com",
  projectId: "trailer-d5892",
  storageBucket: "trailer-d5892.appspot.com",
  messagingSenderId: "1037471022316",
  appId: "1:1037471022316:web:2e5d6eb707cf90cf6b79c9",
  measurementId: "G-LXCSR68J13"
};

export const app = initializeApp(firebaseConfig);
