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
  trigger: "user:pre_registration" as any,
  bindings: {
    "kinde.env": {},
  },
};

export default async function handlePreRegistration(event: any) {
  // Example payload location for org code per docs
  const authParams = event?.request?.authUrlParams ?? {};
  const orgCode = authParams.orgCode || authParams.org_code || null;

  // For testing: read from env or fallback to hardcoded demo URLs
  const TERMS_URL = getEnvironmentVariable("TERMS_URL")?.value || "https://example.com/terms";
  const PRIVACY_URL = getEnvironmentVariable("PRIVACY_URL")?.value || "https://example.com/privacy";

  const context = event.context || {};
  context.user = context.user || {};
  const existingAttributes = context.user.custom_attributes || {};

  // Optionally vary by orgCode. For now, attach same values for testing
  context.user.custom_attributes = {
    ...existingAttributes,
    terms_url: TERMS_URL,
    privacy_url: PRIVACY_URL,
    org_code: orgCode || existingAttributes.org_code,
  };

  // Return event/context so the workflow engine can persist custom attributes
  return { event, context };
}


