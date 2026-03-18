// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

// ── 型定義 ───────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth の状態変化を監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ユーザードキュメントを Firestore に保存（初回ログイン時に作成）
  const upsertUserDoc = async (u: User) => {
    const ref = doc(db, "users", u.uid);
    await setDoc(ref, {
      displayName: u.displayName ?? "",
      email:       u.email ?? "",
      updatedAt:   serverTimestamp(),
    }, { merge: true }); // merge: true で既存フィールドを上書きしない
  };

  // Google ログイン
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
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

  // ログアウト
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
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
