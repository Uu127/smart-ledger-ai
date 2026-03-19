// src/hooks/useReceiptParse.ts
import { useCallback, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ReceiptParseResult } from "@/types/ledger";

type Status = "idle" | "loading" | "success" | "error";

// 画像を Base64 に変換するユーティリティ
async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useReceiptParse() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReceiptParseResult | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const parse = useCallback(async (file: File) => {
    setStatus("loading");
    setError(null);
    try {
      const base64Data = await toBase64(file);
      const parseReceipt = httpsCallable
        { base64Data: string; mimeType: string },
        ReceiptParseResult
      >(functions, "parseReceipt");

      const res = await parseReceipt({ base64Data, mimeType: file.type });
      setResult(res.data);
      setStatus("success");
      return res.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "解析に失敗しました";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { parse, status, result, error, reset };
}