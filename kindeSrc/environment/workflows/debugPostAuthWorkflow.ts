import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  getEnvironmentVariable,
  createKindeAPI,
  fetch,
} from "@kinde/infrastructure";

// The settings for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  name: "Provision users from Federated Identity",
  failurePolicy: {
    action: "stop",
  },
  trigger: WorkflowTrigger.PostAuthentication,
  bindings: {
    "kinde.env": {},
    "kinde.fetch": {},
    url: {},
  },
};

export default async function handlePostAuth(event: onPostAuthenticationEvent) {
  console.log("onPostAuthentication", event);

  const userId = event.context.user.id;

  // Get environment variables for testing
  const TEST_ROLE_KEY = getEnvironmentVariable("TEST_ROLE_KEY")?.value;
  const TEST_ORG_ID = getEnvironmentVariable("TEST_ORG_ID")?.value;

  // Get Kinde API instance
  const kindeAPI = await createKindeAPI(event);

  // Get user details
  const { data: user } = await kindeAPI.get({
    endpoint: `user?id=${userId}&expand=organizations`,
  });
  console.log("User Response:", user);

  // Get organization details
  const { data: organization } = await kindeAPI.get({
    endpoint: `organization?code=${TEST_ORG_ID}`,
  });
  console.log("Organization Response:", organization);

  const isNewKindeUser = event.context.auth.isNewUserRecordCreated;

  // Step 1: Ensure user is assigned to organization with role
  await ensureUserInOrganizationWithRole(kindeAPI, userId, user, TEST_ORG_ID, TEST_ROLE_KEY, isNewKindeUser);
}

async function ensureUserInOrganizationWithRole(
  kindeAPI: any,
  userId: string,
  user: any,
  orgId: string,
  testRoleKey: string
) {
  // Check if user is already in the organization
  const userInOrg = user.organizations?.some((org: any) => org.code === orgId);
  
  if (!userInOrg) {
    // Add user to organization with role in a single API call
    const userPayload: any = { id: userId };
    if (testRoleKey) {
      userPayload.roles = [testRoleKey];
    }
    
    try {
      const addUserToOrgResponse = await kindeAPI.post({
        endpoint: `organizations/${orgId}/users`,
        params: {
          users: [userPayload],
        }
      });
      console.log("Kinde API - Add User to Organization with Role Response Status:", addUserToOrgResponse.status);
      console.log("Kinde API - Add User to Organization with Role Response Data:", JSON.stringify(addUserToOrgResponse.data, null, 2));
    } catch (error) {
      console.error("Error adding user to organization:", error);
      throw error;
    }
  }
}