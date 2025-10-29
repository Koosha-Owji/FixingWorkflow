import {
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "user-post-authentication",
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {},
};

export default async function Workflow(event: any) {
  console.log("=== POST AUTHENTICATION WORKFLOW ===");
  console.log("Full event:", JSON.stringify(event, null, 2));
  
  console.log("\n--- Request Info ---");
  console.log("IP:", event.request?.ip);
  console.log("User Agent:", event.request?.userAgent);
  console.log("Auth URL Params:", JSON.stringify(event.request?.authUrlParams, null, 2));
  
  console.log("\n--- Context Info ---");
  console.log("User ID:", event.context?.user?.id);
  console.log("Is New User:", event.context?.auth?.isNewUserRecordCreated);
  console.log("Connection ID:", event.context?.auth?.connectionId);
  console.log("Kinde Domain:", event.context?.domains?.kindeDomain);
  console.log("Client ID:", event.context?.application?.clientId);
  
  console.log("\n=== END POST AUTH WORKFLOW ===");
}

