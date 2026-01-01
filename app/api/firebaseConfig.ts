// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseApiKey = process.env.FIREBASE_API_KEY;
if (!firebaseApiKey) {
  throw new Error('Missing Firebase API key. Set NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_API_KEY in your environment.');
}
const firebaseConfig = {
  apiKey: String(firebaseApiKey),
  authDomain: "wf-transportes.firebaseapp.com",
  projectId: "wf-transportes",
  storageBucket: "wf-transportes.firebasestorage.app",
  messagingSenderId: "1007058711716",
  appId: "1:1007058711716:web:27ee91b7a0c6328ed6a231",
  measurementId: "G-9P9G5SXZ82"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
if (typeof window !== 'undefined') {
  // initialize analytics in the browser (no local variable needed)
  void getAnalytics(app);
}