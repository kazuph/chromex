import type { CodexSkillOption, CodexStructuredInput } from "@codex-sidepanel/shared";

export interface CodexSkillRuntimeAvailability {
  playwrightAvailable?: boolean;
}

export type CodexSkillRuntimeRequirement = "playwright";

export interface CodexSkillRuntimeProbe {
  id?: string;
  name?: string;
  description?: string;
  path?: string;
  token?: string;
}

export function normalizeEnabledCodexSkillIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

export function toggleEnabledCodexSkillId(enabledIds: string[], skillId: string): string[] {
  const normalizedSkillId = skillId.trim();
  const current = normalizeEnabledCodexSkillIds(enabledIds);
  if (!normalizedSkillId) {
    return current;
  }

  if (current.includes(normalizedSkillId)) {
    return current.filter((item) => item !== normalizedSkillId);
  }

  return [...current, normalizedSkillId];
}

export function createEnabledCodexSkillInputs(
  skills: CodexSkillOption[],
  enabledIds: string[],
  runtimeAvailability: CodexSkillRuntimeAvailability = {},
): CodexStructuredInput[] {
  const enabled = new Set(normalizeEnabledCodexSkillIds(enabledIds));
  return skills
    .filter((skill) => enabled.has(skill.id))
    .filter((skill) => isRuntimeAvailableForSkill(skill, runtimeAvailability))
    .map((skill) => ({
      id: skill.id,
      type: "skill" as const,
      name: skill.name,
      path: skill.path,
      description: skill.description,
      token: skill.token,
    }));
}

export function mergeStructuredInputsWithEnabledCodexSkills(
  structuredInputs: CodexStructuredInput[],
  skills: CodexSkillOption[],
  enabledIds: string[],
  runtimeAvailability: CodexSkillRuntimeAvailability = {},
): CodexStructuredInput[] {
  const merged = new Map<string, CodexStructuredInput>();
  for (const input of structuredInputs) {
    if (input.type === "skill") {
      continue;
    }
    merged.set(input.id, input);
  }

  for (const input of createEnabledCodexSkillInputs(skills, enabledIds, runtimeAvailability)) {
    merged.set(input.id, input);
  }

  return Array.from(merged.values());
}

function isRuntimeAvailableForSkill(
  skill: CodexSkillOption,
  runtimeAvailability: CodexSkillRuntimeAvailability,
): boolean {
  switch (getCodexSkillRuntimeRequirement(skill)) {
    case "playwright":
      return runtimeAvailability.playwrightAvailable === true;
    default:
      return true;
  }
}

export function getCodexSkillRuntimeRequirement(
  skill: CodexSkillRuntimeProbe | CodexStructuredInput,
): CodexSkillRuntimeRequirement | null {
  const haystack = [skill.id, skill.name, skill.description, skill.path, skill.token]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
  if (PLAYWRIGHT_RUNTIME_SKILL_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return "playwright";
  }
  return null;
}

const PLAYWRIGHT_RUNTIME_SKILL_PATTERNS = [
  /\bplaywright\b/iu,
  /\bpuppeteer\b/iu,
  /\bselenium\b/iu,
  /\bchromium\b/iu,
  /\bbrowser[-\s]?automation\b/iu,
  /\bbrowser[-\s]?control\b/iu,
];
