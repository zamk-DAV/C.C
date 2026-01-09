import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyB7OfWA2oX4CuXdNnv9mLxKcBRfmWTRjcA",
    authDomain: "ccdear23.firebaseapp.com",
    projectId: "ccdear23",
    storageBucket: "ccdear23.firebasestorage.app",
    messagingSenderId: "1093526893408",
    appId: "1:1093526893408:web:ea243611d05c3a4c446405",
    measurementId: "G-FHSXD9P5R6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
