// firebaseConfig.js
// =============================================
// Firebase Modular SDK v9 – Optimized for our Arabic Chat App
// =============================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzzontrnq6pyjbP8EhA0PS4uOr9u3bCIE",
  authDomain: "kiom-chat.firebaseapp.com",
  projectId: "kiom-chat",
  storageBucket: "kiom-chat.firebasestorage.app",
  messagingSenderId: "88253677016",
  appId: "1:88253677016:web:0d6eb94ddc9429827dc6ad",
  measurementId: "G-3MVNSPWLEF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services exports (نستخدمها في main.js وغيره)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// محاولة تفعيل Offline Persistence (مهم جداً لتقليل الـ reads في Spark plan)
// هذا يخزن البيانات محلياً في IndexedDB ويُزامن لما يرجع الإنترنت
try {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open – persistence can only be enabled in one tab at a time.");
      } else if (err.code === 'unimplemented') {
        console.warn("Browser does not support persistence.");
      }
    });
} catch (e) {
  console.warn("Persistence setup failed:", e);
}

export default app;