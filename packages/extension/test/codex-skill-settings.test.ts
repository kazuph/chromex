import type { CodexSkillOption, CodexStructuredInput } from "@codex-sidepanel/shared";
import { describe, expect, test } from "vitest";

import {
  createEnabledCodexSkillInputs,
  mergeStructuredInputsWithEnabledCodexSkills,
  normalizeEnabledCodexSkillIds,
  toggleEnabledCodexSkillId,
} from "../src/codex-skill-settings.js";

const skills: CodexSkillOption[] = [
  {
    id: "/tmp/skills/doc/SKILL.md#doc",
    name: "doc",
    description: "Document helper",
    path: "/tmp/skills/doc/SKILL.md",
    scope: "user",
    cwd: "/tmp/project",
    token: "$doc",
  },
  {
    id: "/tmp/skills/review/SKILL.md#review",
    name: "review",
    description: "Review helper",
    path: "/tmp/skills/review/SKILL.md",
    scope: "repo",
    cwd: "/tmp/project",
    token: "$review",
  },
];

describe("Codex skill settings", () => {
  test("normalizes persisted enabled skill ids", () => {
    expect(normalizeEnabledCodexSkillIds(["doc", "", "doc", 42, "review"])).toEqual(["doc", "review"]);
    expect(normalizeEnabledCodexSkillIds(undefined)).toEqual([]);
  });

  test("toggles one Codex skill id while keeping the list stable", () => {
    expect(toggleEnabledCodexSkillId([], "doc")).toEqual(["doc"]);
    expect(toggleEnabledCodexSkillId(["doc", "review"], "doc")).toEqual(["review"]);
    expect(toggleEnabledCodexSkillId(["doc"], "")).toEqual(["doc"]);
  });

  test("creates app-server structured skill inputs only for enabled skills", () => {
    expect(createEnabledCodexSkillInputs(skills, [skills[1]!.id])).toEqual([
      {
        id: skills[1]!.id,
        type: "skill",
        name: "review",
        path: "/tmp/skills/review/SKILL.md",
        description: "Review helper",
        token: "$review",
      },
    ]);
  });

  test("drops disabled skill inputs but preserves non-skill structured inputs", () => {
    const existing: CodexStructuredInput[] = [
      {
        id: "gmail",
        type: "mention",
        name: "Gmail",
        path: "app://gmail",
        token: "$gmail",
      },
      {
        id: skills[0]!.id,
        type: "skill",
        name: "doc",
        path: "/tmp/skills/doc/SKILL.md",
        token: "$doc",
      },
    ];

    expect(mergeStructuredInputsWithEnabledCodexSkills(existing, skills, [skills[1]!.id])).toEqual([
      existing[0],
      {
        id: skills[1]!.id,
        type: "skill",
        name: "review",
        path: "/tmp/skills/review/SKILL.md",
        description: "Review helper",
        token: "$review",
      },
    ]);
  });
});
