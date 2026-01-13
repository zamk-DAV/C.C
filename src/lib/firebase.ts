import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

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
// Initialize Firestore with long polling to avoid QUIC errors in some environments
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const analytics = getAnalytics(app);

export const VAPID_KEY = "BHIQdXZi0lzpVBH4f7dIBI1zCnkfs55p8NQbCF1SAk5lhrf6QHH2DqUx08wKSCpd1-qrePN08NpOKlAUkcIJuHI";

export default app;
