// src/components/DateInput.tsx
import { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface Props {
  value: string;                          // "YYYY-MM-DD"
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;                     // wrapper の追加クラス（focus-within:ring など）
  style?: React.CSSProperties;           // wrapper の追加スタイル
}

export function DateInput({ value, onChange, required, className = "", style }: Props) {
  const [y, setY] = useState(value?.slice(0, 4) ?? "");
  const [m, setM] = useState(value?.slice(5, 7) ?? "");
  const [d, setD] = useState(value?.slice(8, 10) ?? "");

  const yRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const dRef = useRef<HTMLInputElement>(null);
  // emit が呼ぶ onChange → value 変化 → useEffect のループを防ぐ
  const skipSync = useRef(false);

  // AI 自動入力など外部から value が変わったとき同期（自分の emit 由来は除外）
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (value && value.length === 10) {
      setY(value.slice(0, 4));
      setM(value.slice(5, 7));
      setD(value.slice(8, 10));
    } else if (!value) {
      setY(""); setM(""); setD("");
    }
  }, [value]);

  // 3フィールド揃ったら YYYY-MM-DD を emit、不完全なら ""
  const emit = (ny: string, nm: string, nd: string) => {
    skipSync.current = true;
    if (ny.length === 4 && nm.length >= 1 && nd.length >= 1) {
      onChange(`${ny}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const handleYear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setY(v);
    if (v.length === 4) { mRef.current?.focus(); mRef.current?.select(); }
    emit(v, m, d);
  };

  const handleMonth = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (v && parseInt(v) > 12) v = "12";
    setM(v);
    // 月は01-12: 先頭が2以上なら2桁目はないので即フォーカス、2桁揃ったらフォーカス
    if (v.length === 2 || (v.length === 1 && parseInt(v) > 1)) {
      dRef.current?.focus(); dRef.current?.select();
    }
    emit(y, v, d);
  };

  const handleDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (v && parseInt(v) > 31) v = "31";
    setD(v);
    emit(y, m, v);
  };

  // 月・日フィールドが空の状態でBackspaceを押したら前フィールドに戻る
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: "m" | "d") => {
    if (e.key === "Backspace" && (field === "m" ? m : d) === "") {
      e.preventDefault();
      if (field === "m") { yRef.current?.focus(); yRef.current?.select(); }
      else               { mRef.current?.focus(); mRef.current?.select(); }
    }
  };

  // ネイティブ日付ピッカーで選択したとき
  const handleNativePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // "YYYY-MM-DD"
    if (v && v.length === 10) {
      setY(v.slice(0, 4));
      setM(v.slice(5, 7));
      setD(v.slice(8, 10));
      skipSync.current = true;
      onChange(v);
    }
  };

  // ネイティブ input[type=date] に渡す現在値
  const nativeValue =
    y.length === 4 && m.length >= 1 && d.length >= 1
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : "";

  const cell = "bg-transparent text-sm font-bold focus:outline-none text-center";

  return (
    <div
      className={`flex items-center gap-1 px-3 py-3 rounded-xl border ${className}`}
      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border)", ...style }}
    >
      <input
        ref={yRef}
        type="text"
        inputMode="numeric"
        value={y}
        onChange={handleYear}
        placeholder="YYYY"
        maxLength={4}
        required={required}
        aria-label="年"
        className={`${cell} w-14`}
        style={{ color: "var(--text-main)" }}
      />
      <span className="text-sm font-bold select-none" style={{ color: "var(--text-muted)" }}>/</span>
      <input
        ref={mRef}
        type="text"
        inputMode="numeric"
        value={m}
        onChange={handleMonth}
        onKeyDown={e => handleKeyDown(e, "m")}
        placeholder="MM"
        maxLength={2}
        aria-label="月"
        className={`${cell} w-8`}
        style={{ color: "var(--text-main)" }}
      />
      <span className="text-sm font-bold select-none" style={{ color: "var(--text-muted)" }}>/</span>
      <input
        ref={dRef}
        type="text"
        inputMode="numeric"
        value={d}
        onChange={handleDay}
        onKeyDown={e => handleKeyDown(e, "d")}
        placeholder="DD"
        maxLength={2}
        aria-label="日"
        className={`${cell} w-8`}
        style={{ color: "var(--text-main)" }}
      />

      {/* カレンダーボタン：アイコンの上に透明な input[type=date] を重ねてネイティブピッカーを起動 */}
      <div className="relative ml-auto shrink-0" style={{ color: "var(--text-muted)" }}>
        <Calendar className="w-4 h-4 pointer-events-none" />
        <input
          type="date"
          value={nativeValue}
          onChange={handleNativePick}
          tabIndex={-1}
          aria-label="カレンダーで選択"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
