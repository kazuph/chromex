import {
  ArrowDown,
  ArrowLeft,
  Archive,
  AudioLines,
  BadgeQuestionMark,
  Bookmark,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronRight,
  CodeXml,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Hand,
  Image,
  List,
  Menu,
  MessageCircle,
  Mic,
  Minus,
  MoreHorizontal,
  MoreVertical,
  PanelRight,
  Paperclip,
  Plus,
  RefreshCw,
  ScanLine,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  Video,
  X,
  Zap,
  type IconNode,
} from "lucide";

import { escapeAttribute } from "./html-escape.js";

export type UiIconName =
  | "archive"
  | "arrow-down"
  | "arrow-left"
  | "audio-lines"
  | "bookmark"
  | "chart"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "code"
  | "copy"
  | "external-link"
  | "file-text"
  | "globe"
  | "hand"
  | "image"
  | "list"
  | "menu"
  | "message"
  | "mic"
  | "minus"
  | "more-horizontal"
  | "more-vertical"
  | "panel"
  | "paperclip"
  | "plus"
  | "question"
  | "refresh"
  | "scan"
  | "send"
  | "settings"
  | "shield-alert"
  | "shield-check"
  | "stop"
  | "stop-filled"
  | "trash"
  | "video"
  | "x"
  | "zap";

const UI_ICON_NODES: Record<UiIconName, IconNode> = {
  archive: Archive,
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "audio-lines": AudioLines,
  bookmark: Bookmark,
  chart: ChartColumn,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  code: CodeXml,
  copy: Copy,
  "external-link": ExternalLink,
  "file-text": FileText,
  globe: Globe,
  hand: Hand,
  image: Image,
  list: List,
  menu: Menu,
  message: MessageCircle,
  mic: Mic,
  minus: Minus,
  "more-horizontal": MoreHorizontal,
  "more-vertical": MoreVertical,
  panel: PanelRight,
  paperclip: Paperclip,
  plus: Plus,
  question: BadgeQuestionMark,
  refresh: RefreshCw,
  scan: ScanLine,
  send: Send,
  settings: Settings,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  stop: Square,
  "stop-filled": Square,
  trash: Trash2,
  video: Video,
  x: X,
  zap: Zap,
};

export function renderUiIcon(icon: UiIconName, className = "ui-lucide-icon"): string {
  const node = UI_ICON_NODES[icon];
  const fill = icon === "stop-filled" ? "currentColor" : "none";
  return `
    <svg
      class="lucide ${escapeAttribute(className)} ${escapeAttribute(icon)}"
      data-ui-icon="${escapeAttribute(icon)}"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="${fill}"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      ${node.map(([tag, attrs]) => renderIconChild(tag, attrs)).join("")}
    </svg>
  `;
}

function renderIconChild(tag: string, attrs: Record<string, string | number | undefined>): string {
  return `<${tag} ${Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([name, value]) => `${name}="${escapeAttribute(String(value))}"`)
    .join(" ")}></${tag}>`;
}
