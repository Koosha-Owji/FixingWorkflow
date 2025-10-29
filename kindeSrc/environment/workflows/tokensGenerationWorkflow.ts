import {
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "user-tokens-generation",
  trigger: WorkflowTrigger.TokensGeneration,
  bindings: {},
};

export default async function Workflow(event: any) {
  console.log("=== TOKENS GENERATION WORKFLOW ===");
  console.log("Full event:", JSON.stringify(event, null, 2));
  
  console.log("\n--- Request Info ---");
  console.log("IP:", event.request?.ip);
  console.log("Audience:", JSON.stringify(event.request?.auth?.audience));
  
  console.log("\n--- Auth Context ---");
  console.log("Origin:", event.context?.auth?.origin);
  console.log("Is Existing Session:", event.context?.auth?.isExistingSession);
  console.log("Connection ID:", event.context?.auth?.connectionId);
  
  console.log("\n--- User Info ---");
  console.log("User ID:", event.context?.user?.id);
  console.log("Identity ID:", event.context?.user?.identityId);
  
  console.log("\n--- Organization ---");
  console.log("Org Code:", event.context?.organization?.code);
  
  console.log("\n--- Application ---");
  console.log("Client ID:", event.context?.application?.clientId);
  console.log("Kinde Domain:", event.context?.domains?.kindeDomain);
  
  console.log("\n=== END TOKENS GENERATION WORKFLOW ===");
}

