import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, TwitterAuthProvider, signOut } from "firebase/auth";

// 🔹 Replace with your Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBTj84iQYRreRcaMro33syx5rZHYxM6dvw",
    authDomain: "proto-36642.firebaseapp.com",
    projectId: "proto-36642",
    storageBucket: "proto-36642.firebasestorage.app",
    messagingSenderId: "783938316828",
    appId: "1:783938316828:web:0686d605db90634bc5cdd9",
    measurementId: "G-E819QMZ9TX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const twitterProvider = new TwitterAuthProvider();