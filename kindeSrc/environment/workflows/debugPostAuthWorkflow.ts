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

  console.log("Processing user authentication for testing");
  console.log("Environment variables - TEST_ORG_ID:", TEST_ORG_ID, "TEST_ROLE_KEY:", TEST_ROLE_KEY);

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
  testRoleKey: string,
  isNewUser: boolean
) {
  console.log("Ensuring user is assigned to organization with role");

  // Check if user is already in the organization
  const userInOrg = user.organizations?.some((org: any) => org.code === orgId);
  
  if (!userInOrg) {
    console.log("Adding user to organization with role");
    
    // Add user to organization with role in a single API call
    const userPayload: any = { id: userId };
    if (testRoleKey) {
      userPayload.roles = [testRoleKey];
    }
    
    console.log("Request payload:", JSON.stringify({ users: [userPayload] }, null, 2));
    
    try {
      const addUserToOrgResponse = await kindeAPI.post({
        endpoint: `organizations/${orgId}/users`,
        body: {
          users: [userPayload],
        }
      });
      console.log("Kinde API - Add User to Organization with Role Response Status:", addUserToOrgResponse.status);
      console.log("Kinde API - Add User to Organization with Role Response Data:", JSON.stringify(addUserToOrgResponse.data, null, 2));
    } catch (error) {
      console.error("Error adding user to organization:", error);
      throw error;
    }
  } else {
    console.log("User already in organization - checking role assignment");
    
    if (testRoleKey) {
      // User is in org, but we need to check if they have the role
      const { data: userRolesData } = await kindeAPI.get({
        endpoint: `organizations/${orgId}/users/${userId}/roles`,
      });
      const currentRoles = userRolesData?.roles || [];
      console.log("Current User Roles:", currentRoles);

      // Check if user has the test role (by key, not ID)
      const hasTestRole = currentRoles.some((role: any) => role.key === testRoleKey);
      if (!hasTestRole) {
        console.log("Adding missing test role to existing organization user");
        await assignRole(kindeAPI, userId, orgId, testRoleKey, "Test");
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
  roleKey: string,
  roleName: string
) {
  console.log(`Assigning ${roleName} role to user`);
  
  try {
    // Note: Individual role assignment might still use role_key in the body
    // This is different from the bulk organization user addition which uses role keys in the roles array
    const addRoleResponse = await kindeAPI.post({
      endpoint: `organizations/${orgId}/users/${userId}/roles`,
      body: { role_key: roleKey },
    });
    
    console.log(`Kinde API - Add ${roleName} Role Response Status:`, addRoleResponse.status);
    console.log(`Kinde API - Add ${roleName} Role Response Data:`, JSON.stringify(addRoleResponse.data, null, 2));
  } catch (error) {
    console.error(`Error assigning ${roleName} role:`, error);
    throw error;
  }
}