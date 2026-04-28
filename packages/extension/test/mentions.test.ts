import { describe, expect, test } from "vitest";

import { extractMentionQuery, listMentionOptions } from "../src/sidepanel/mentions.js";

describe("mention helpers", () => {
  test("extracts the active @query from the composer", () => {
    expect(extractMentionQuery("summarize @his")).toBe("his");
    expect(extractMentionQuery("summarize this")).toBeNull();
  });

  test("lists mention options filtered by query prefix", () => {
    expect(listMentionOptions("im").map((option) => option.id)).toEqual([]);
    expect(listMentionOptions("his").map((option) => option.id)).toEqual([]);
    expect(listMentionOptions("tab").map((option) => option.id)).toEqual(["context:open-tabs"]);
    expect(listMentionOptions("").map((option) => option.id)).toEqual(["context:open-tabs"]);
  });

  test("does not expose app-server apps, skills, or plugins as @mentions", () => {
    const result = listMentionOptions("git", "en", {
      apps: [
        {
          id: "github-app",
          name: "GitHub App",
          description: "Connected app",
          path: "app://github-app",
          token: "$github-app",
          isAccessible: true,
          isEnabled: true,
        },
      ],
      skills: [
        {
          id: "/tmp/skill/SKILL.md#git-review",
          name: "git-review",
          description: "Review git changes",
          path: "/tmp/skill/SKILL.md",
          scope: "repo",
          cwd: "/tmp/project",
          token: "$git-review",
        },
      ],
      plugins: [
        {
          id: "github@openai-curated",
          name: "GitHub",
          description: "Plugin",
          marketplaceName: "openai-curated",
          path: "plugin://github@openai-curated",
          token: "$github",
          installed: true,
          enabled: true,
          capabilities: ["repositories"],
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
