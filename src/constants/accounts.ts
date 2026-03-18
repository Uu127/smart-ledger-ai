// src/constants/accounts.ts

// ── 借方勘定科目（個人事業主・青色申告対応） ──────────────────────────
export const DEBIT_ACCOUNTS = [
    // 売上原価
    { group: "売上原価",      label: "仕入高" },
    { group: "売上原価",      label: "外注費" },
    // 人件費
    { group: "人件費",        label: "給料賃金" },
    { group: "人件費",        label: "専従者給与" },
    { group: "人件費",        label: "福利厚生費" },
    // 地代・設備
    { group: "地代・設備",    label: "地代家賃" },
    { group: "地代・設備",    label: "修繕費" },
    { group: "地代・設備",    label: "減価償却費" },
    // 移動・通信
    { group: "移動・通信",    label: "旅費交通費" },
    { group: "移動・通信",    label: "通信費" },
    { group: "移動・通信",    label: "車両費" },
    { group: "移動・通信",    label: "荷造運賃" },
    // 営業・販促
    { group: "営業・販促",    label: "接待交際費" },
    { group: "営業・販促",    label: "会議費" },
    { group: "営業・販促",    label: "広告宣伝費" },
    // 事務用品・消耗品
    { group: "事務用品",      label: "消耗品費" },
    { group: "事務用品",      label: "新聞図書費" },
    // 税・保険
    { group: "税・保険",      label: "租税公課" },
    { group: "税・保険",      label: "損害保険料" },
    // 財務
    { group: "財務",          label: "利子割引料" },
    { group: "財務",          label: "貸倒金" },
    // 研修・教育
    { group: "研修・教育",    label: "研修費" },
    // 水道光熱
    { group: "水道光熱",      label: "水道光熱費" },
    // 手数料
    { group: "手数料",        label: "支払手数料" },
    // その他
    { group: "その他",        label: "雑費" },
  ] as const;
  
  export type DebitAccountLabel = typeof DEBIT_ACCOUNTS[number]["label"];
  
  /** セレクトボックス用フラットリスト */
  export const DEBIT_ACCOUNT_LABELS: DebitAccountLabel[] = DEBIT_ACCOUNTS.map(a => a.label);
  
  /** グループ別Map（グループセレクト用） */
  export const DEBIT_ACCOUNTS_BY_GROUP = DEBIT_ACCOUNTS.reduce<Record<string, string[]>>(
    (acc, { group, label }) => {
      (acc[group] ??= []).push(label);
      return acc;
    },
    {}
  );
  
  // ── 貸方勘定科目（支払方法） ───────────────────────────────────────────
  export const CREDIT_ACCOUNTS = [
    "現金",
    "普通預金",
    "当座預金",
    "クレジットカード",
    "電子マネー",
    "口座振替",
  ] as const;
  
  export type CreditAccountLabel = typeof CREDIT_ACCOUNTS[number];
  
  // Geminiプロンプト用リスト文字列
  export const DEBIT_ACCOUNTS_FOR_PROMPT = DEBIT_ACCOUNT_LABELS.join(", ");