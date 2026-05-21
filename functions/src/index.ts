// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const GEMINI_KEY = defineSecret("GEMINI_API_KEY");

// ── Gemini: レシート解析 ──────────────────────────────────
export const parseReceipt = onCall(
  { secrets: [GEMINI_KEY], region: "asia-northeast1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    const imageBase64 = request.data.imageBase64 ?? request.data.base64Data;
    const mimeType    = request.data.mimeType || "image/jpeg";
    if (!imageBase64) throw new HttpsError("invalid-argument", "Missing image data");

    const apiKey   = GEMINI_KEY.value();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
あなたはレシート・領収書・請求書の解析専門家です。
画像から以下の情報をJSON形式で抽出してください。

抽出項目:
- date: 取引日（YYYY-MM-DD形式。不明なら今日の日付）
- amount: 合計金額（数値のみ、税込み）
- counterparty: 店名・取引先名
- suggestedDescription: 摘要（購入品目の要約）
- suggestedDebitAccount: 最適な借方勘定科目（以下から選択）

勘定科目リスト:
仕入高, 外注費, 給料賃金, 専従者給与, 福利厚生費,
地代家賃, 修繕費, 減価償却費, 旅費交通費, 通信費,
車両費, 荷造運賃, 接待交際費, 会議費, 広告宣伝費,
消耗品費, 新聞図書費, 租税公課, 損害保険料, 利子割引料,
貸倒金, 研修費, 水道光熱費, 支払手数料, 雑費

JSONのみ返してください（バッククォート不要）:
{"date":"YYYY-MM-DD","amount":0,"counterparty":"","suggestedDescription":"","suggestedDebitAccount":""}
    `.trim();

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
    };

    const res  = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    try {
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return {
        date: new Date().toISOString().slice(0, 10),
        amount: 0, counterparty: "", suggestedDescription: "", suggestedDebitAccount: "雑費",
      };
    }
  }
);

// ── Gemini: 売上請求書解析 ────────────────────────────────
export const parseSalesReceipt = onCall(
  { secrets: [GEMINI_KEY], region: "asia-northeast1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    const imageBase64 = request.data.imageBase64 ?? request.data.base64Data;
    const mimeType    = request.data.mimeType || "image/jpeg";
    if (!imageBase64) throw new HttpsError("invalid-argument", "Missing image data");

    const apiKey   = GEMINI_KEY.value();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
請求書・売上伝票の画像から以下をJSON形式で抽出してください。

{"date":"YYYY-MM-DD","amount":0,"counterparty":"","description":""}

date: 請求日または発行日
amount: 請求金額（税込合計）
counterparty: 請求先・取引先名
description: サービス内容・品目の要約

JSONのみ返してください。
    `.trim();

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
    };

    const res  = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    try {
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return { date: new Date().toISOString().slice(0, 10), amount: 0, counterparty: "", description: "" };
    }
  }
);

// ── スケジュール通知: 毎朝9時（JST）────────────────────────
export const sendScheduledNotifications = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Tokyo", region: "asia-northeast1" },
  async () => {
    const db        = getFirestore();
    const messaging = getMessaging();
    const today     = new Date();
    const month     = today.getMonth() + 1;
    const day       = today.getDate();

    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const uid      = userDoc.id;
      const settingsDoc = await db
        .collection("users").doc(uid)
        .collection("settings").doc("notifications")
        .get();

      if (!settingsDoc.exists) continue;

      const s = settingsDoc.data() as {
        enabled: boolean;
        taxDeadline: boolean;
        unpaidInvoices: boolean;
        invoiceDueDate: boolean;
        fcmToken?: string;
      };

      if (!s.enabled || !s.fcmToken) continue;
      const token = s.fcmToken;

      // 確定申告リマインダー（3/1・3/10・3/14）
      if (s.taxDeadline && month === 3 && [1, 10, 14].includes(day)) {
        await messaging.send({
          token,
          notification: {
            title: "📅 確定申告の締切が近づいています",
            body:  `3月15日まであと${15 - day}日です。申告書データを確認しましょう。`,
          },
          webpush: { fcmOptions: { link: "https://smart-ledger-ai-759b7.web.app/tax" } },
        }).catch(console.error);
      }

      // 未送付請求書（3日以上経過）
      if (s.unpaidInvoices) {
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);
        const cutoff = threeDaysAgo.toISOString().slice(0, 10);

        const drafts = await db
          .collection("users").doc(uid)
          .collection("documents")
          .where("type", "==", "invoice")
          .where("status", "==", "draft")
          .get();

        const oldDrafts = drafts.docs.filter(d => d.data().issueDate <= cutoff);

        if (oldDrafts.length > 0) {
          await messaging.send({
            token,
            notification: {
              title: `📄 未送付の請求書が${oldDrafts.length}件あります`,
              body:  "作成から3日以上経過した下書き請求書があります。",
            },
            webpush: { fcmOptions: { link: "https://smart-ledger-ai-759b7.web.app/documents" } },
          }).catch(console.error);
        }
      }

      // 支払期限3日前
      if (s.invoiceDueDate) {
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);
        const targetDate = threeDaysLater.toISOString().slice(0, 10);

        const dueSoon = await db
          .collection("users").doc(uid)
          .collection("documents")
          .where("type",    "==", "invoice")
          .where("status",  "==", "sent")
          .where("dueDate", "==", targetDate)
          .get();

        for (const inv of dueSoon.docs) {
          const d = inv.data();
          await messaging.send({
            token,
            notification: {
              title: "💰 請求書の支払期限が近づいています",
              body:  `${d.clientName} への請求書の支払期限は${d.dueDate}です。`,
            },
            webpush: { fcmOptions: { link: "https://smart-ledger-ai-759b7.web.app/documents" } },
          }).catch(console.error);
        }
      }
    }
  }
);