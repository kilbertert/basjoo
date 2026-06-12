/**
 * PR12: minimal in-package i18n dictionary for the widget SDK.
 *
 * Three visitor-facing locales (zh-CN, en-US, vi-VN) covering the 14 strings
 * the widget renders itself. The widget does NOT import the admin app's
 * i18next setup — the admin locale (basjoo_locale) and the widget locale
 * (basjoo_widget_locale) are intentionally independent (PR12 design D12).
 *
 * The PR11 backend already added a vi_VN gettext catalogue for the 22 core
 * auth/API error messages; the strings here cover the widget SDK's own UI
 * (selector label + the 10 strings previously inlined in `getText()`).
 *
 * No runtime dependencies. ~120 LOC, ~2 KB minified.
 */

export type WidgetLocale = "zh-CN" | "en-US" | "vi-VN";

export const SUPPORTED_LOCALES: readonly WidgetLocale[] = [
  "zh-CN",
  "en-US",
  "vi-VN",
] as const;

export const DEFAULT_LOCALE: WidgetLocale = "zh-CN";

/** localStorage key — distinct from the admin app's `basjoo_locale`. */
export const WIDGET_LOCALE_STORAGE_KEY = "basjoo_widget_locale";

type Dictionary = {
  // ---- selector (4) ----
  languageSelectorLabel: string;
  optionZh: string;
  optionEn: string;
  optionVi: string;
  // ---- existing getText() strings (10) ----
  sendFailed: string;
  networkError: string;
  quotaExceeded: string;
  takenOverNotice: string;
  inputPlaceholder: string;
  messageTooLong: string;
  greetingBubble: string;
  newMessage: string;
  thinking: string;
  references: string;
};

export const LOCALES: Record<WidgetLocale, Dictionary> = {
  "zh-CN": {
    languageSelectorLabel: "语言",
    optionZh: "中文",
    optionEn: "English",
    optionVi: "Tiếng Việt",
    sendFailed: "发送失败，请稍后重试",
    networkError: "网络连接失败，请检查网络",
    quotaExceeded: "今日消息已达上限",
    takenOverNotice: "已转接人工客服，请等待回复。",
    inputPlaceholder: "输入您的问题...",
    messageTooLong: "消息过长（最多2000字符）",
    greetingBubble: "你好！有什么可以帮您？",
    newMessage: "新消息",
    thinking: "思考中...",
    references: "参考来源",
  },
  "en-US": {
    languageSelectorLabel: "Language",
    optionZh: "Chinese",
    optionEn: "English",
    optionVi: "Vietnamese",
    sendFailed: "Send failed, please try again later",
    networkError: "Network connection failed, please check your connection",
    quotaExceeded: "Daily message limit reached",
    takenOverNotice:
      "Your conversation has been transferred to a human agent. Please wait for their reply.",
    inputPlaceholder: "Type your question...",
    messageTooLong: "Message too long (max 2000 characters)",
    greetingBubble: "Hi! How can I help you?",
    newMessage: "New message",
    thinking: "Thinking...",
    references: "References",
  },
  "vi-VN": {
    languageSelectorLabel: "Ngôn ngữ",
    optionZh: "Tiếng Trung",
    optionEn: "Tiếng Anh",
    optionVi: "Tiếng Việt",
    sendFailed: "Gửi thất bại, vui lòng thử lại sau",
    networkError: "Kết nối mạng thất bại, vui lòng kiểm tra mạng",
    quotaExceeded: "Đã đạt giới hạn tin nhắn hôm nay",
    takenOverNotice:
      "Đã chuyển tiếp cho nhân viên hỗ trợ, vui lòng đợi phản hồi.",
    inputPlaceholder: "Nhập câu hỏi của bạn...",
    messageTooLong: "Tin nhắn quá dài (tối đa 2000 ký tự)",
    greetingBubble: "Xin chào! Tôi có thể giúp gì cho bạn?",
    newMessage: "Tin nhắn mới",
    thinking: "Đang suy nghĩ...",
    references: "Nguồn tham khảo",
  },
};

/** Narrow `unknown` to a `WidgetLocale` literal. */
export function isWidgetLocale(value: unknown): value is WidgetLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).indexOf(value) !== -1
  );
}

/**
 * Resolve an arbitrary BCP-47-ish input to a supported widget locale.
 *
 * - `null` / `undefined` / empty → `DEFAULT_LOCALE`
 * - exact case-sensitive match against `SUPPORTED_LOCALES` → that locale
 * - language prefix `zh` (zh, zh-TW, zh-HK, ...) → `zh-CN`
 * - language prefix `vi` (vi, vi-VN, ...) → `vi-VN`
 * - everything else → `DEFAULT_LOCALE` (silent fallback; do not throw)
 */
export function resolveLocale(input?: string | null): WidgetLocale {
  if (!input) return DEFAULT_LOCALE;
  if (isWidgetLocale(input)) return input;
  const lower = input.toLowerCase();
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("vi")) return "vi-VN";
  if (lower.startsWith("en")) return "en-US";
  return DEFAULT_LOCALE;
}

/** Look up a dictionary key for the given locale. */
export function t(locale: WidgetLocale, key: keyof Dictionary): string {
  return LOCALES[locale][key];
}
