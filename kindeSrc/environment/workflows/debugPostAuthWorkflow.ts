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
  const TEST_ROLE_ID = getEnvironmentVariable("TEST_ROLE_ID")?.value;
  const TEST_ORG_ID = getEnvironmentVariable("TEST_ORG_ID")?.value;

  console.log("Processing user authentication for testing");

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
  await ensureUserInOrganizationWithRole(kindeAPI, userId, user, TEST_ORG_ID, TEST_ROLE_ID, isNewKindeUser);
}

async function ensureUserInOrganizationWithRole(
  kindeAPI: any,
  userId: string,
  user: any,
  orgId: string,
  testRoleId: string,
  isNewUser: boolean
) {
  console.log("Ensuring user is assigned to organization with role");

  // Check if user is already in the organization
  const userInOrg = user.organizations?.some((org: any) => org.code === orgId);
  
  if (!userInOrg) {
    console.log("Adding user to organization with role");
    
    // Add user to organization with role in a single API call
    const userPayload: any = { id: userId };
    if (testRoleId) {
      userPayload.roles = [testRoleId];
    }
    
    const addUserToOrgResponse = await kindeAPI.post({
      endpoint: `organizations/${orgId}/users`,
      body: {
        users: [userPayload],
      }
    });
    console.log("Kinde API - Add User to Organization with Role Response:", addUserToOrgResponse);
  } else {
    console.log("User already in organization - checking role assignment");
    
    if (testRoleId) {
      // User is in org, but we need to check if they have the role
      const { data: userRolesData } = await kindeAPI.get({
        endpoint: `organizations/${orgId}/users/${userId}/roles`,
      });
      const currentRoles = userRolesData?.roles || [];
      console.log("Current User Roles:", currentRoles);

      // Check if user has the test role
      const hasTestRole = currentRoles.some((role: any) => role.id === testRoleId);
      if (!hasTestRole) {
        console.log("Adding missing test role to existing organization user");
        await assignRole(kindeAPI, userId, orgId, testRoleId, "Test");
      } else {
        console.log("User already has the test role");
      }
    }
  }
}

async function assignRole(
  kindeAPI: any,
  userId: string,
  orgId: string,
  roleId: string,
  roleName: string
) {
  console.log(`Assigning ${roleName} role to user`);
  
  const addRoleResponse = await kindeAPI.post({
    endpoint: `organizations/${orgId}/users/${userId}/roles`,
    body: { role_id: roleId },
  });
  
  console.log(`Kinde API - Add ${roleName} Role Response:`, addRoleResponse);
}