import { describe, expect, test } from "vitest";

import { extractSlashQuery, listSlashCommandOptions } from "../src/sidepanel/skills.js";

describe("skills", () => {
  test("extracts a slash query from the composer", () => {
    expect(extractSlashQuery("/summ")).toBe("summ");
    expect(extractSlashQuery("please /youtube")).toBe("youtube");
    expect(extractSlashQuery("/요약")).toBe("요약");
    expect(extractSlashQuery("plain text")).toBeNull();
  });

  test("lists only profile commands for slash invocation", () => {
    const results = listSlashCommandOptions(
      "legal",
      [
        {
          id: "custom-skill",
          name: "Legal Shortcut",
          prompt: "Draft a legal summary.",
          description: "Shortcut",
        },
      ],
      [
        {
          id: "legal-reviewer",
          name: "Legal Reviewer",
          systemPrompt: "Review legal context.",
          defaultContextPolicy: {
            attachCurrentPageByDefault: true,
            allowedReadStrategies: ["dom"],
          },
          allowedSources: ["current-page"],
          preferredActions: [],
          adapterHints: [],
        },
      ],
      "en",
      "default",
    );

    expect(results[0]).toMatchObject({
      id: "profile:legal-reviewer",
      kind: "profile",
      label: "Legal Reviewer",
    });
    expect(results.every((option) => option.kind === "profile")).toBe(true);
  });

  test("marks the active profile in slash command options", () => {
    const results = listSlashCommandOptions(
      "",
      [],
      [
        {
          id: "default",
          name: "Default",
          systemPrompt: "",
          defaultContextPolicy: {
            attachCurrentPageByDefault: false,
            allowedReadStrategies: ["dom"],
          },
          allowedSources: [],
          preferredActions: [],
          adapterHints: [],
        },
        {
          id: "research-assistant",
          name: "Research Assistant",
          systemPrompt: "",
          defaultContextPolicy: {
            attachCurrentPageByDefault: true,
            allowedReadStrategies: ["dom"],
          },
          allowedSources: ["current-page"],
          preferredActions: [],
          adapterHints: [],
        },
      ],
      "ko",
      "default",
    );

    expect(results[0]).toMatchObject({
      id: "profile:default",
      kind: "profile",
      active: true,
      description: "",
    });
  });

  test("passes profile visual metadata to slash command options", () => {
    const results = listSlashCommandOptions(
      "designer",
      [],
      [
        {
          id: "custom-designer",
          name: "Designer",
          systemPrompt: "",
          defaultContextPolicy: {
            attachCurrentPageByDefault: false,
            allowedReadStrategies: ["dom"],
          },
          allowedSources: ["current-page"],
          preferredActions: [],
          adapterHints: [],
          visual: {
            color: "#3998f5",
            icon: "palette",
          },
        },
      ],
      "en",
      "default",
    );

    expect(results[0]).toMatchObject({
      kind: "profile",
      visual: {
        color: "#3998f5",
        icon: "palette",
      },
    });
  });

  test("does not list Codex app-server skills as slash attach commands", () => {
    const results = listSlashCommandOptions(
      "review",
      [],
      [],
      "en",
      "default",
    );

    expect(results).toEqual([]);
  });

  test("filters profile commands by the text after the slash", () => {
    const results = listSlashCommandOptions(
      "research",
      [
        {
          id: "custom-email",
          name: "Email Reply",
          prompt: "Draft a reply.",
          description: "Mail shortcut",
        },
      ],
      [
        {
          id: "research-assistant",
          name: "Research Assistant",
          systemPrompt: "",
          defaultContextPolicy: {
            attachCurrentPageByDefault: true,
            allowedReadStrategies: ["dom"],
          },
          allowedSources: ["current-page"],
          preferredActions: [],
          adapterHints: [],
        },
      ],
      "en",
      "default",
    );

    expect(results.map((option) => option.label)).toEqual(["Research Assistant"]);
    expect(results.some((option) => option.label === "Email Reply")).toBe(false);
  });
});
