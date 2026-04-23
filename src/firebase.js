import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRN-sUVw_Zzi2c1O2FJsDwuPbptVUctHk",
  authDomain: "enyi-e9e51.firebaseapp.com",
  projectId: "enyi-e9e51",
  storageBucket: "enyi-e9e51.firebasestorage.app",
  messagingSenderId: "91084779087",
  appId: "1:91084779087:web:7b71e7ff9422acbf09843a",
  measurementId: "G-VYBEN9225N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();