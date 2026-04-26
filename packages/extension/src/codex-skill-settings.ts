import type { CodexSkillOption, CodexStructuredInput } from "@codex-sidepanel/shared";

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
): CodexStructuredInput[] {
  const enabled = new Set(normalizeEnabledCodexSkillIds(enabledIds));
  return skills
    .filter((skill) => enabled.has(skill.id))
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
): CodexStructuredInput[] {
  const merged = new Map<string, CodexStructuredInput>();
  for (const input of structuredInputs) {
    if (input.type === "skill") {
      continue;
    }
    merged.set(input.id, input);
  }

  for (const input of createEnabledCodexSkillInputs(skills, enabledIds)) {
    merged.set(input.id, input);
  }

  return Array.from(merged.values());
}
