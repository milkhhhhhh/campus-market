/** 内置聊天表情目录 */

export interface BuiltinSticker {
  /** 稳定 id，如 campus/ok；消息 STICKER.content 使用此值 */
  id: string;
  label: string;
  /** 资源文件名（网站端可按需挂载静态资源） */
  file: string;
}

export const BUILTIN_STICKERS: readonly BuiltinSticker[] = [
  { id: "campus/ok", label: "OK", file: "ok.png" },
  { id: "campus/hi", label: "你好", file: "hi.png" },
  { id: "campus/thanks", label: "谢谢", file: "thanks.png" },
  { id: "campus/yes", label: "可以", file: "yes.png" },
  { id: "campus/no", label: "不行", file: "no.png" },
  { id: "campus/wait", label: "等等", file: "wait.png" },
  { id: "campus/love", label: "喜欢", file: "love.png" },
  { id: "campus/laugh", label: "哈哈", file: "laugh.png" },
  { id: "campus/cry", label: "哭哭", file: "cry.png" },
  { id: "campus/angry", label: "生气", file: "angry.png" },
  { id: "campus/think", label: "思考", file: "think.png" },
  { id: "campus/cool", label: "酷", file: "cool.png" },
  { id: "campus/clap", label: "鼓掌", file: "clap.png" },
  { id: "campus/wave", label: "拜拜", file: "wave.png" },
  { id: "campus/deal", label: "成交", file: "deal.png" },
  { id: "campus/pin", label: "定位", file: "pin.png" },
  { id: "campus/money", label: "钱", file: "money.png" },
  { id: "campus/box", label: "快递", file: "box.png" },
  { id: "campus/face", label: "面交", file: "face.png" },
  { id: "campus/star", label: "星", file: "star.png" },
] as const;

export const BUILTIN_STICKER_IDS: ReadonlySet<string> = new Set(
  BUILTIN_STICKERS.map((item) => item.id),
);

export function isBuiltinStickerId(id: string): boolean {
  return BUILTIN_STICKER_IDS.has(id);
}

export function getBuiltinSticker(id: string): BuiltinSticker | undefined {
  return BUILTIN_STICKERS.find((item) => item.id === id);
}

/** 常用 Unicode Emoji（聊天面板） */
export const CHAT_EMOJI_LIST: readonly string[] = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😜",
  "🤔",
  "😏",
  "😌",
  "😴",
  "😭",
  "😤",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "🎉",
  "❤️",
  "💯",
  "🤝",
  "👀",
  "😅",
  "😆",
  "😇",
  "🤗",
  "🤫",
  "🤐",
  "🥺",
  "🤩",
  "😎",
  "🥳",
  "😭",
  "🤦",
  "🤷",
  "📦",
  "💰",
  "🏠",
  "📍",
  "⏰",
  "✅",
  "❌",
  "❓",
];

export function stickerFavoriteKey(
  kind: "BUILTIN" | "IMAGE",
  stickerId?: string | null,
  imageUrl?: string | null,
): string {
  if (kind === "BUILTIN") {
    if (!stickerId) throw new Error("BUILTIN favorite requires stickerId");
    return `BUILTIN:${stickerId}`;
  }
  if (!imageUrl) throw new Error("IMAGE favorite requires imageUrl");
  return `IMAGE:${imageUrl}`;
}
