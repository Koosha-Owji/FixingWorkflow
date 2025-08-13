import {
  WorkflowSettings,
  getEnvironmentVariable,
  idTokenCustomClaims,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "tokenAddPoliciesOnFirstAuth",
  name: "Add policy URLs to ID token on first auth",
  failurePolicy: { action: "stop" },
  // Token customization trigger
  trigger: "user:tokens_generation",
  bindings: {
    "kinde.env": {},
    "kinde.idToken": {},
  },
};

export default async function handleUserToken(event: any) {
  const isNewUser = Boolean(event?.context?.auth?.isNewUserRecordCreated);

  if (!isNewUser) {
    // Only add these for brand new users to show once on sign-up
    return event;
  }

  const TERMS_URL = getEnvironmentVariable("TERMS_URL")?.value || "https://example.com/terms";
  const PRIVACY_URL = getEnvironmentVariable("PRIVACY_URL")?.value || "https://example.com/privacy";

  const idToken = idTokenCustomClaims<{ terms_url: string; privacy_url: string }>();
  idToken.terms_url = TERMS_URL;
  idToken.privacy_url = PRIVACY_URL;

  return event;
}


