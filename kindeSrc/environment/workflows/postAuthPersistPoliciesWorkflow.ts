import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  getEnvironmentVariable,
  createKindeAPI,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "postAuthPersistPolicies",
  name: "Persist policies custom_attributes after user creation",
  failurePolicy: { action: "stop" },
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.env": {},
    "kinde.fetch": {},
    url: {},
  },
};

export default async function handlePostAuth(event: onPostAuthenticationEvent) {
  const userId = event.context.user.id;
  const termsEnv = getEnvironmentVariable("TERMS_URL")?.value || "https://example.com/terms";
  const privacyEnv = getEnvironmentVariable("PRIVACY_URL")?.value || "https://example.com/privacy";

  // If pre-reg couldn't persist, ensure we still attach after creation
  const pendingAttrs = event.context.user?.custom_attributes || {};
  const desired = {
    terms_url: pendingAttrs.terms_url || termsEnv,
    privacy_url: pendingAttrs.privacy_url || privacyEnv,
  };

  const api = await createKindeAPI(event);

  // Read before
  const beforeResp = await api.get({ endpoint: `user`, params: { id: userId, expand: "none" } });
  console.log("[post-auth] existing user attrs:", JSON.stringify(beforeResp?.data?.custom_attributes || {}));

  // Persist via update using JSON body only (avoid URLSearchParams)
  try {
    const putResp = await api.put({
      endpoint: `user`,
      json: { id: userId, custom_attributes: desired },
    });
    console.log("[post-auth] PUT user custom_attributes status:", putResp.status);
  } catch (e) {
    console.log("[post-auth] Error updating user custom_attributes:", e);
    throw e;
  }

  // Read after
  const afterResp = await api.get({ endpoint: `user`, params: { id: userId, expand: "none" } });
  console.log("[post-auth] updated user attrs:", JSON.stringify(afterResp?.data?.custom_attributes || {}));
}


