import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  idTokenCustomClaims,
  accessTokenCustomClaims,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugClaimsWorkflow",
  name: "Debug Claims Workflow",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.idToken": {},
    "kinde.accessToken": {},
  },
};

export default async function handleTokenGeneration(
  event: onUserTokenGeneratedEvent
) {
  // Use the infrastructure helpers to access all token claims
  const idToken = idTokenCustomClaims<Record<string, any>>();
  const accessToken = accessTokenCustomClaims<Record<string, any>>();

  // Log all existing claims for inspection
  console.log("ID Token Claims:", idToken);
  console.log("Access Token Claims:", accessToken);
}
