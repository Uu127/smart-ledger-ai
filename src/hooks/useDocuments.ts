// src/hooks/useDocuments.ts
import { useCallback, useEffect, useState } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
  doc as fsDoc, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessDocument, IssuerProfile } from "@/types/document";

// ── 書類CRUD ─────────────────────────────────────────────
export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ref   = collection(db, "users", user.uid, "documents");
    const q     = query(ref, orderBy("issueDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BusinessDocument, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const addDocument = useCallback(async (doc_: Omit<BusinessDocument, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    const ref = collection(db, "users", user.uid, "documents");
    // undefinedフィールドを除去（Firestoreはundefinedを受け付けない）
    const cleanData = Object.fromEntries(
      Object.entries({ ...doc_, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        .filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(ref, cleanData);
    return docRef.id;
  }, [user]);

  const updateDocument = useCallback(async (id: string, data: Partial<BusinessDocument>) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "documents", id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "documents", id));
  }, [user]);

  return { documents, loading, addDocument, updateDocument, deleteDocument };
}

// ── 発行者プロフィール ────────────────────────────────────
export function useIssuerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<IssuerProfile>({ name: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const ref  = fsDoc(db, "users", user.uid, "settings", "issuerProfile");
      const snap = await getDoc(ref);
      if (snap.exists()) setProfile(snap.data() as IssuerProfile);
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = useCallback(async (p: IssuerProfile) => {
    if (!user) return;
    setProfile(p);
    const ref = fsDoc(db, "users", user.uid, "settings", "issuerProfile");
    await setDoc(ref, { ...p, updatedAt: serverTimestamp() }, { merge: true });
  }, [user]);

  return { profile, loading, saveProfile };
}