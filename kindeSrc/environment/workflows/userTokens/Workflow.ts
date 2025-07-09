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
    "YOUR_APP1_CLIENT_ID": "org_001",
    "YOUR_APP2_CLIENT_ID": "org_002",
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