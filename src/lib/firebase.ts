// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);

export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const storage  = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// オフラインキャッシュを有効化（ネット切れでも動作・復帰後に自動同期）
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // 複数タブが開いている場合は有効化できない（許容）
    console.warn("Firestore persistence: multiple tabs open");
  } else if (err.code === "unimplemented") {
    // ブラウザが対応していない場合（許容）
    console.warn("Firestore persistence: not supported in this browser");
  }
});
