import type { UiLocale } from "./i18n.js";

export type AttachmentMenuAction =
  | "add-files"
  | "attach-tabs"
  | "attach-screenshot"
  | "saved-prompts";

export interface AttachmentMenuItem {
  action: AttachmentMenuAction;
  label: string;
  icon: "paperclip" | "video" | "scan" | "bookmark";
  section: "primary";
  enabled: boolean;
  hasSubmenu?: boolean;
}

export function listAttachmentMenuItems(locale: UiLocale): AttachmentMenuItem[] {
  const ko = locale === "ko";
  return [
    {
      action: "add-files",
      label: ko ? "사진 및 파일 추가" : "Add photos and files",
      icon: "paperclip",
      section: "primary",
      enabled: true,
    },
    {
      action: "attach-tabs",
      label: ko ? "탭 첨부" : "Attach tabs",
      icon: "video",
      section: "primary",
      enabled: true,
    },
    {
      action: "attach-screenshot",
      label: ko ? "스크린샷 첨부" : "Attach screenshot",
      icon: "scan",
      section: "primary",
      enabled: true,
    },
    {
      action: "saved-prompts",
      label: ko ? "저장된 프롬프트" : "Saved prompts",
      icon: "bookmark",
      section: "primary",
      enabled: true,
    },
  ];
}
