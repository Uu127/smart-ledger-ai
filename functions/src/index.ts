// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineSecret } from "firebase-functions/params";

// Gemini APIキーは Secret Manager で管理（クライアントには公開しない）
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const DEBIT_ACCOUNTS = [
  "仕入高", "外注費",
  "給料賃金", "専従者給与", "福利厚生費",
  "地代家賃", "修繕費", "減価償却費",
  "旅費交通費", "通信費", "車両費", "荷造運賃",
  "接待交際費", "会議費", "広告宣伝費",
  "消耗品費", "新聞図書費",
  "租税公課", "損害保険料",
  "利子割引料", "貸倒金",
  "研修費", "水道光熱費", "支払手数料", "雑費",
].join(", ");

const SYSTEM_PROMPT = `
あなたは日本の会計・簿記に精通したエキスパートです。
提供された領収書や請求書の画像から、経費精算に必要な情報を正確に抽出してください。

# 抽出ルール:
1. date: 領収日を YYYY-MM-DD 形式で抽出。不明な場合は今日の日付を返してください。
2. amount: 税込の総支払い金額（合計額）を数値のみで抽出。
3. counterparty: 発行元（店名・会社名）を抽出。
4. suggestedDebitAccount: 以下のリストから最も適したものを1つ選んでください：
   [${DEBIT_ACCOUNTS}]
5. suggestedDescription: 「商品名（またはサービス内容） + 等」の形式で簡潔な摘要を作成。

# 科目選択ガイド:
- 交通費（電車・バス・タクシー） → 旅費交通費
- ガソリン・駐車場・車検 → 車両費
- 電話・インターネット・切手 → 通信費
- 接待・会食（取引先との食事） → 接待交際費
- 社内会議の飲食・弁当 → 会議費
- 文房具・プリンター用紙 → 消耗品費
- 書籍・雑誌・新聞 → 新聞図書費
- 電気・水道・ガス → 水道光熱費
- 広告・チラシ・Web広告 → 広告宣伝費
- セミナー・研修参加費 → 研修費
- 家賃・事務所駐車場代 → 地代家賃
- 振込・決済手数料 → 支払手数料
- 収入印紙・登録免許税 → 租税公課
- 上記以外 → 雑費

# 禁止事項:
- 広告の数字や電話番号を金額と間違えないこと
- 合計と小計が両方ある場合は「合計」を採用すること
- 出力は以下のJSONのみ。解説やMarkdown装飾を含めないこと

{"date":"string","amount":number,"counterparty":"string","suggestedDebitAccount":"string","suggestedDescription":"string"}
`;

export const parseReceipt = onCall(
  {
    secrets: [geminiApiKey],
    region: "asia-northeast1", // 東京リージョン（レイテンシ最小化）
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 10,
  },
  async (request) => {
    // 未認証は即拒否
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const { base64Data, mimeType } = request.data as {
      base64Data: string;
      mimeType: string;
    };

    if (!base64Data || !mimeType) {
      throw new HttpsError("invalid-argument", "画像データが不正です");
    }

    const apiKey = geminiApiKey.value();
    const genAI  = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    try {
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType } },
        "このレシートを解析してJSONで出力してください。",
      ]);

      const text = result.response.text();
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(clean);
    } catch (error) {
      console.error("Gemini error:", error);
      throw new HttpsError("internal", "画像の解析中にエラーが発生しました");
    }
  }
);
