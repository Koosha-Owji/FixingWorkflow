import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.env": {},
    "kinde.fetch": {},
    url: {}
  },
};

async function getUserWithOrganizations(userId: string, event: onUserPostAuthenticationEvent) {
  try {
    console.log("=== FETCHING USER WITH ORGANIZATIONS ===");

    // Get Kinde API instance
    const kindeAPI = await createKindeAPI(event);

    // Get user details with organizations expanded
    const endpoint = `user?id=${userId}&expand=organizations`;
    console.log("API endpoint:", endpoint);

    const { data: user } = await kindeAPI.get({
      endpoint: endpoint,
    });

    console.log("=== USER API RESPONSE ===");
    console.log("Full user object:", JSON.stringify(user, null, 2));

    // Check if organizations exist
    if (user?.organizations && user.organizations.length > 0) {
      console.log("=== ORGANIZATIONS FOUND ===");
      console.log("Number of organizations:", user.organizations.length);

      // Log each organization
      user.organizations.forEach((org: any, index: number) => {
        console.log(`Organization ${index + 1}:`, JSON.stringify(org, null, 2));
      });

      // If we want to get more details about the first organization
      const firstOrgCode = user.organizations[0]?.code;
      if (firstOrgCode) {
        console.log("=== FETCHING DETAILED ORG INFO ===");
        console.log("Organization code:", firstOrgCode);

        const { data: organization } = await kindeAPI.get({
          endpoint: `organization?code=${firstOrgCode}`,
        });

        console.log("=== DETAILED ORGANIZATION RESPONSE ===");
        console.log("Full organization object:", JSON.stringify(organization, null, 2));
      }
    } else {
      console.log("=== NO ORGANIZATIONS FOUND ===");
      console.log("User is not a member of any organizations");
    }

    return user;

  } catch (error) {
    console.error("=== ERROR FETCHING USER DATA ===");
    console.error("Error type:", typeof error);
    console.error("Error:", error);
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
        await getUserWithOrganizations(event.context.user.id, event);
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