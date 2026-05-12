import type { UserFileAttachment } from "@codex-sidepanel/shared";

import type { EditablePageImageCandidate } from "../page-image-target.js";

type RemoteImageAttachment = UserFileAttachment & {
  kind: "image";
  sourceUrl: string;
};

export async function materializeRemoteImageAttachments(
  attachments: UserFileAttachment[],
  options: {
    resolveVisibleCandidate: (sourceUrl: string) => Promise<EditablePageImageCandidate | null>;
    materializeAttachment: (
      attachment: RemoteImageAttachment,
      imageCandidate: EditablePageImageCandidate | null,
    ) => Promise<UserFileAttachment | null>;
    onMaterializationError?: (sourceUrl: string, error: unknown) => void;
  },
): Promise<UserFileAttachment[]> {
  const resolved: UserFileAttachment[] = [];

  for (const attachment of attachments) {
    const remoteAttachment = toRemoteImageAttachment(attachment);
    if (!remoteAttachment) {
      resolved.push(attachment);
      continue;
    }

    try {
      const imageCandidate = await options.resolveVisibleCandidate(remoteAttachment.sourceUrl);
      const materialized = await options.materializeAttachment(remoteAttachment, imageCandidate);
      resolved.push(materialized ?? attachment);
    } catch (error) {
      options.onMaterializationError?.(remoteAttachment.sourceUrl, error);
      resolved.push(attachment);
    }
  }

  return resolved;
}

function toRemoteImageAttachment(attachment: UserFileAttachment): RemoteImageAttachment | null {
  const sourceUrl = attachment.sourceUrl?.trim() ?? "";
  if (
    attachment.kind !== "image" ||
    attachment.base64.trim() ||
    !sourceUrl ||
    !/^https?:\/\//iu.test(sourceUrl)
  ) {
    return null;
  }
  return {
    ...attachment,
    kind: "image",
    sourceUrl,
  };
}
