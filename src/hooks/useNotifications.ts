// src/hooks/useNotifications.ts
import { useCallback, useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getApp } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_KEY = "BD6oDMsS2vD7e_rUhaM7b3b_87Z0xGC6oqDqljyoieapz3QgPHdqm9GHNdy8SYeGcrTRjFmuk1szZooThNix4xM";

export interface NotificationSettings {
  enabled: boolean;
  taxDeadline: boolean;      // 確定申告締切（3月1日・3月10日・3月14日）
  unpaidInvoices: boolean;   // 未送付請求書
  invoiceDueDate: boolean;   // 支払期限リマインダー（3日前）
  fcmToken?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled:        false,
  taxDeadline:    true,
  unpaidInvoices: true,
  invoiceDueDate: true,
};

export function useNotifications() {
  const { user } = useAuth();
  const [settings, setSettings]   = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]     = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // 現在のパーミッション状態を取得
  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  // Firestoreから設定を読み込む
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const ref  = doc(db, "users", user.uid, "settings", "notifications");
        const snap = await getDoc(ref);
        if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() as NotificationSettings });
      } catch (e) {
        console.error("Notification settings load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // フォアグラウンド通知の受信
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const messaging = getMessaging(getApp());
      const unsub = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {};
        if (title) new Notification(title, { body, icon: "/icon-192.png" });
      });
      return () => unsub();
    } catch (e) {
      console.error("FCM onMessage error:", e);
    }
  }, [permission]);

  // 通知を有効化（パーミッション要求 → FCMトークン取得）
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    if (!("Notification" in window)) {
      alert("このブラウザはプッシュ通知に対応していません");
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const messaging = getMessaging(getApp());
      const token     = await getToken(messaging, { vapidKey: VAPID_KEY });

      const next: NotificationSettings = { ...settings, enabled: true, fcmToken: token };
      await saveSettings(next);
      return true;
    } catch (e) {
      console.error("FCM token error:", e);
      return false;
    }
  }, [user, settings]);

  // 設定を保存
  const saveSettings = useCallback(async (next: NotificationSettings) => {
    if (!user) return;
    setSettings(next);
    const ref = doc(db, "users", user.uid, "settings", "notifications");
    await setDoc(ref, { ...next, updatedAt: serverTimestamp() }, { merge: true });
  }, [user]);

  // 通知を無効化
  const disableNotifications = useCallback(async () => {
    const next = { ...settings, enabled: false, fcmToken: undefined };
    await saveSettings(next);
  }, [settings, saveSettings]);

  return {
    settings, loading, permission,
    enableNotifications, disableNotifications, saveSettings,
  };
}