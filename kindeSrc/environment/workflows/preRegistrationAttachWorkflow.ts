import {
  WorkflowSettings,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

// The settings for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "preRegistrationPolicies",
  name: "Attach TOS/Privacy URLs at pre-registration",
  failurePolicy: {
    action: "stop",
  },
  // The SDK enum name may vary; use string literal to align with user:pre_registration
  trigger: "user:pre_registration",
  bindings: {
    "kinde.env": {},
  },
};

export default async function handlePreRegistration(event: any) {
  // Example payload location for org code per docs
  const authParams = event?.request?.authUrlParams ?? {};
  console.log("[pre-registration] authUrlParams:", JSON.stringify(authParams));
  const orgCode = authParams.orgCode || authParams.org_code || null;

  // For testing: read from env or fallback to hardcoded demo URLs
  const TERMS_URL = getEnvironmentVariable("TERMS_URL")?.value || "https://example.com/terms";
  const PRIVACY_URL = getEnvironmentVariable("PRIVACY_URL")?.value || "https://example.com/privacy";

  // Mutate the incoming event context directly so the workflow engine persists it
  event.context = event.context || {};
  event.context.user = event.context.user || {};
  const existingAttributes = event.context.user.custom_attributes || {};

  // Optionally vary by orgCode. For now, attach same values for testing
  event.context.user.custom_attributes = {
    ...existingAttributes,
    terms_url: TERMS_URL,
    privacy_url: PRIVACY_URL,
    org_code: orgCode || existingAttributes.org_code,
    _pre_reg_ts: new Date().toISOString(),
  };

  console.log("[pre-registration] custom_attributes set:", JSON.stringify(event.context.user.custom_attributes));

  // Return both event and context to maximize compatibility with engine expectations
  return { event, context: event.context };
}


