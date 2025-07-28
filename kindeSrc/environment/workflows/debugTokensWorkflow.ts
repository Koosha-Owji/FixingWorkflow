import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  idTokenCustomClaims,
  accessTokenCustomClaims,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugTokensWorkflow",
  name: "Debug Tokens Generation Workflow",
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
  console.log("=== TOKEN GENERATION EVENT ===");
  
  // Log the entire event object
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  // Log specific event properties
  if (event.user) {
    console.log("User data:", event.user);
  }
  
  if (event.organization) {
    console.log("Organization data:", event.organization);
  }

  // Use the infrastructure helpers to access token claims
  try {
    const idToken = idTokenCustomClaims<Record<string, any>>();
    const accessToken = accessTokenCustomClaims<Record<string, any>>();

    console.log("ID Token Claims:", idToken);
    console.log("Access Token Claims:", accessToken);
  } catch (error) {
    console.log("Error accessing token claims:", error);
  }

  // Log all available properties on the event
  console.log("Event keys:", Object.keys(event));
  
  // Log each property individually
  for (const key in event) {
    if (event.hasOwnProperty(key)) {
      console.log(`${key}:`, (event as any)[key]);
    }
  }
} 