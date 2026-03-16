// src/hooks/useReceiptParse.ts
import { useCallback, useState } from "react";
import type { ReceiptParseResult } from "@/types/ledger";
import { parseReceiptWithAI } from "@/lib/gemini";

type Status = "idle" | "loading" | "success" | "error";

export function useReceiptParse() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReceiptParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = useCallback(async (file: File) => {
    setStatus("loading");
    setError(null);
    try {
      const data = await parseReceiptWithAI(file);
      setResult(data);
      setStatus("success");
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : "解析に失敗しました";
      setError(message);
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