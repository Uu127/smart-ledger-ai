// src/hooks/useReceiptParse.ts
import { useCallback, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ReceiptParseResult } from "@/types/ledger";

type Status = "idle" | "loading" | "success" | "error";

// Canvas経由でJPEGに変換（iOS HEIC・空MIMEタイプ対応）
async function fileToJpeg(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.naturalWidth  * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        base64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1],
        mimeType: "image/jpeg",
      });
    };
    // canvas変換できない場合（まれにあるフォーマット）はFileReaderで直接読む
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64: (reader.result as string).split(",")[1],
        mimeType: file.type || "image/jpeg",
      });
      reader.readAsDataURL(file);
    };
    img.src = url;
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
      const { base64, mimeType } = await fileToJpeg(file);
      const parseReceipt = httpsCallable<
        { imageBase64: string; mimeType: string },
        ReceiptParseResult
      >(functions, "parseReceipt");

      const res = await parseReceipt({ imageBase64: base64, mimeType });
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
