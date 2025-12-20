type ModerationGuardrailConfig = {
  name: string;
  type: "content_policy";
  description: string;
  rules: Array<{
    id: string;
    label: string;
    guidance: string;
  }>;
};

/**
 * Creates a simple content-policy guardrail that can be passed to the
 * Realtime SDK. Downstream services can replace this with a richer policy
 * definition (e.g., pulling from a CMS), but for now we keep a small inline
 * contract so the UI can function without additional dependencies.
 */
export function createModerationGuardrail(companyName: string): ModerationGuardrailConfig {
  return {
    name: "dexter-moderation",
    type: "content_policy",
    description: `Basic content moderation policy for ${companyName}.`,
    rules: [
      {
        id: "safety-disallowed",
        label: "Disallowed Content",
        guidance:
          "Block content that is hateful, harassing, violent, or otherwise disallowed by OpenAI usage policies. If a violation is detected, mark the guardrail as failed and prompt the assistant to provide a safe alternative response.",
      },
      {
        id: "financial-compliance",
        label: "Financial Compliance",
        guidance:
          "Prevent responses that provide personalized investment advice or violate regional financial regulations. Encourage the user to consult a qualified professional when necessary.",
      },
    ],
  };
}

export type { ModerationGuardrailConfig };
