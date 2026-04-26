import { inferActionCards, type ActionCard, type OpenTabContext } from "@codex-sidepanel/shared";

import { createSitePayload } from "../site-payload.js";

const YOUTUBE_ADAPTER_ACTIONS = ["summarize-video", "summarize-current-timestamp", "draft-blog-post"];

export function inferActionCardsForOpenTab(
  tab: Pick<OpenTabContext, "title" | "url"> | null | undefined,
  locale = "",
): ActionCard[] {
  if (!tab) {
    return [];
  }

  const adapterPayload = createSitePayload(tab);
  if (!adapterPayload) {
    return [];
  }
  return inferActionCards({
    readStrategy: "adapter",
    adapterActions: adapterPayload.platform === "youtube" ? YOUTUBE_ADAPTER_ACTIONS : [],
    availableSources: ["current-page"],
    adapterPayload,
    locale,
  });
}
