import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEBIT_ACCOUNTS_FOR_PROMPT } from "@/constants/accounts";

// 1. 環境変数の読み込み
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 2. Geminiに与える「役割」と「ルール」を定義（システムプロンプト）
const buildSystemPrompt = () => `
あなたは日本の会計・簿記に精通したエキスパートです。
提供された領収書や請求書の画像から、経費精算に必要な情報を正確に抽出してください。

# 抽出ルール:
1. date: 領収日を YYYY-MM-DD 形式で抽出。不明な場合は実行時の日付を返してください。
2. amount: 税込の総支払い金額（合計額）を数値のみで抽出。
3. counterparty: 発行元（店名・会社名）を抽出。
4. suggestedDebitAccount: 以下のリストから、画像の内容に最も適したものを1つ選んでください：
   [${DEBIT_ACCOUNTS_FOR_PROMPT}]
5. suggestedDescription: 「商品名（またはサービス内容） + 等」の形式で簡潔な摘要を作成。

# 勘定科目の選び方ガイド:
- 交通費（電車・バス・タクシー・新幹線）→ 旅費交通費
- ガソリン・駐車場・車検 → 車両費
- 電話・インターネット・切手 → 通信費
- 接待・会食（取引先との食事） → 接待交際費
- 社内会議の飲食・弁当 → 会議費
- 文房具・プリンター用紙・トナー → 消耗品費
- 書籍・雑誌・新聞 → 新聞図書費
- 電気・水道・ガス → 水道光熱費
- 広告・チラシ印刷・Web広告 → 広告宣伝費
- セミナー・研修参加費 → 研修費
- 家賃・駐車場代（事務所） → 地代家賃
- 振込手数料・決済手数料 → 支払手数料
- 収入印紙・登録免許税 → 租税公課
- 上記以外の細かい出費 → 雑費

# 禁止事項:
- 広告の数字や電話番号、住所の一部を金額と間違えないでください。
- 合計金額と小計が両方ある場合は、必ず「合計（Total）」の方を採用してください。
- 出力は必ず以下のJSON形式のみとし、解説やMarkdownの装飾（\`\`\`json 等）は一切含めないでください。

{
  "date": "string",
  "amount": number,
  "counterparty": "string",
  "suggestedDebitAccount": "string",
  "suggestedDescription": "string"
}
`;

// 3. メインの解析関数
export async function parseReceiptWithAI(file: File) {
  if (!API_KEY) {
    throw new Error("Gemini API Key が設定されていません。プロジェクトルートの .env ファイルを確認してください。");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(),
  });

  // 画像ファイルをBase64形式に変換
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
      "このレシートを解析してJSONで出力してください。",
    ]);

    const response = await result.response;
    const text = response.text();

    const cleanJsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(cleanJsonText);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("画像の解析中にエラーが発生しました。");
  }
}