// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

// ── 型定義 ───────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sheetsToken: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  connectSheets: () => Promise<string>;
}

// ── Context ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetsToken, setSheetsToken] = useState<string | null>(() =>
    sessionStorage.getItem("sheets_token")
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const upsertUserDoc = async (u: User) => {
    const ref = doc(db, "users", u.uid);
    await setDoc(ref, {
      displayName: u.displayName ?? "",
      email:       u.email ?? "",
      updatedAt:   serverTimestamp(),
    }, { merge: true });
  };

  const saveToken = (token: string | null) => {
    setSheetsToken(token);
    if (token) sessionStorage.setItem("sheets_token", token);
    else sessionStorage.removeItem("sheets_token");
  };

  // Google ログイン（Sheetsスコープ込み）
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    saveToken(credential?.accessToken ?? null);
    await upsertUserDoc(result.user);
  };

  // Email ログイン
  const loginWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserDoc(result.user);
  };

  // Email サインアップ
  const signupWithEmail = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await upsertUserDoc(result.user);
  };

  // Sheets 用に Google 再認証してアクセストークンを取得
  const connectSheets = async (): Promise<string> => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? "";
    saveToken(token);
    return token;
  };

  const logout = async () => {
    saveToken(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, sheetsToken,
      loginWithGoogle, loginWithEmail, signupWithEmail, logout, connectSheets,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth フック ────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
