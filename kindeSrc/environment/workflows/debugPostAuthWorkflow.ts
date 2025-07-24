import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  fetch,
  getEnvironmentVariable,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {},
    "kinde.fetch": {},
    "kinde.env": {},
  },
};

async function getUserWithOrganizations(userId: string) {
  const token = getEnvironmentVariable("KINDE_API_TOKEN")?.value || "";
  const url = `/api/v1/user?id=${userId}&expand=organizations`;

  try {
    console.log("Making API call to:", url);
    const response = await fetch(url, {
      method: "GET",
      responseFormat: "json",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.data) {
      throw new Error(`API call failed`);
    }

    const userData = response.data;
    console.log("=== API RESPONSE: User data with organizations ===");
    console.log(JSON.stringify(userData, null, 2));
    return userData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent
) {
  // Log the entire event object to see what's available
  console.log("=== POST AUTHENTICATION EVENT ===");
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  // Log specific event properties if they exist
  if (event.context?.user) {
    console.log("User data:", event.context.user);
    
    // Try to get full user details with organizations if we have a user ID
    if (event.context.user.id) {
      try {
        console.log("Fetching detailed user data with organizations...");
        await getUserWithOrganizations(event.context.user.id);
      } catch (error) {
        console.error("Failed to fetch detailed user data:", error);
      }
    }
  }
  
  if (event.context?.auth) {
    console.log("Auth data:", event.context.auth);
  }

  if (event.context?.application) {
    console.log("Application data:", event.context.application);
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