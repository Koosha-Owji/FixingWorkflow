import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {},
  },
};

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent
) {
  // Log the entire event object to see what's available
  console.log("=== POST AUTHENTICATION EVENT ===");
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  // Log specific event properties if they exist
  if (event.user) {
    console.log("User data:", event.user);
  }
  
  if (event.organization) {
    console.log("Organization data:", event.organization);
  }
  
  if (event.auth) {
    console.log("Auth data:", event.auth);
  }

  // Log all available properties on the event
  console.log("Event keys:", Object.keys(event));
  
  // Try to access any other properties that might be on the event
  for (const key in event) {
    if (event.hasOwnProperty(key)) {
      console.log(`${key}:`, (event as any)[key]);
    }
  }
} 