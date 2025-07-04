import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
  accessTokenCustomClaims,
} from "@kinde/infrastructure";

// The setting for this workflow - matching customer's configuration
export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  name: "Custom Access Token Workflow",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {},
    "kinde.fetch": {},
    "kinde.env": {},
    url: {},
  },
};

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: onUserTokenGeneratedEvent) {
  try {
    console.log("Starting Custom Access Token Workflow");
    
    // Create Kinde API instance using M2M credentials
    const kindeAPI = await createKindeAPI(event);
    const orgCode = event.context.organization.code;

    console.log(`Fetching organization data for code: ${orgCode}`);
    
    // Make API call to get organization data
    const { data: org } = await kindeAPI.get({
      endpoint: `organization?code=${orgCode}`,
    });

    console.log(`Organization found: ${JSON.stringify(org, null, 2)}`);

    // Create custom access token claims
    const accessToken = accessTokenCustomClaims<{
      org_slug: string;
    }>();

    // Add the organization handle to the access token
    accessToken.org_slug = (org as any).handle;
    
    console.log("Successfully added org_slug to access token");
    
  } catch (error) {
    console.error("Error in Custom Access Token Workflow:", error);
    
    // Log detailed error information to help debug the credential issue
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Re-throw the error to trigger the failure policy
    throw error;
  }
} 