import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  denyAccess,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "testAppOrgIsolation",
  name: "Test App-to-Org Restriction",
  failurePolicy: { action: "stop" },
  trigger: WorkflowTrigger.UserTokenGeneration,
  bindings: {
    "kinde.auth": {},
  },
};

export default async function handleTokenGeneration(event: onUserTokenGeneratedEvent) {
  const clientId = event.context.application.clientId;
  const orgCode = event.context.organization.code;
  const userId = event.context.user.id;
  const isExistingSession = event.context.auth.isExistingSession;

  console.log("Token Generation Test", {
    clientId,
    orgCode,
    userId,
    isExistingSession, // This tells us if it's SSO or fresh login
  });

  // Define your test mapping
  const allowedOrgByClientId: Record<string, string> = {
    "dc4e87a3451f4ad3860a1373f9e38188": "org_eb1fd735afaf",
    "2e6a7360cea4428c81e5ee1ce84fa47f": "org_eb1fd735afaf",
  };

  const expectedOrgCode = allowedOrgByClientId[clientId];

  if (!expectedOrgCode) {
    console.error(`Unknown client_id: ${clientId}`);
    denyAccess("Unknown app");
    return;
  }

  if (orgCode !== expectedOrgCode) {
    console.error(`Org mismatch: got ${orgCode}, expected ${expectedOrgCode}`);
    denyAccess("Wrong org for this app");
    return;
  }

  console.log(`✅ Access granted: ${orgCode} matches ${expectedOrgCode}`);
}