import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
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
  // Access the token bindings
  const accessToken = event.bindings["kinde.accessToken"];
  const idToken = event.bindings["kinde.idToken"];

  // Retrieve all existing claims
  const idClaims = idToken.getAllClaims();
  const accessClaims = accessToken.getAllClaims();

  // Log them for inspection
  console.log("ID Token Claims:", idClaims);
  console.log("Access Token Claims:", accessClaims);
}
