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

  // Step 1: Ensure user is assigned to organization
  await ensureUserInOrganization(kindeAPI, userId, user, TEST_ORG_ID);

  // Step 2: Assign test role within the organization
  await assignTestRole(kindeAPI, userId, TEST_ORG_ID, TEST_ROLE_ID, isNewKindeUser);
}

async function ensureUserInOrganization(
  kindeAPI: any,
  userId: string,
  user: any,
  orgId: string
) {
  console.log("Ensuring user is assigned to organization");

  // Check if user is already in the organization
  const userInOrg = user.organizations?.some((org: any) => org.code === orgId);
  
  if (!userInOrg) {
    console.log("Adding user to organization");
    const addUserToOrgResponse = await kindeAPI.patch({
      endpoint: `organizations/${orgId}/users`,
      body: {
        users: [{ id: userId }],
      }
    });
    console.log("Kinde API - Add User to Organization Response:", addUserToOrgResponse);
  } else {
    console.log("User already in organization");
  }
}

async function assignTestRole(
  kindeAPI: any,
  userId: string,
  orgId: string,
  testRoleId: string,
  isNewUser: boolean
) {
  console.log("Assigning test role within organization");

  if (!testRoleId) {
    console.log("No test role ID provided");
    return;
  }

  if (isNewUser) {
    // For new users, assign the test role
    console.log("New user - assigning test role");
    await assignRole(kindeAPI, userId, orgId, testRoleId, "Test");
  } else {
    // For existing users, check current roles and ensure they have the test role
    console.log("Existing user - checking and updating role");
    
    const { data: userRolesData } = await kindeAPI.get({
      endpoint: `organizations/${orgId}/users/${userId}/roles`,
    });
    const currentRoles = userRolesData?.roles || [];
    console.log("Current User Roles:", currentRoles);

    // Ensure user has the test role
    const hasTestRole = currentRoles.some((role: any) => role.id === testRoleId);
    if (!hasTestRole) {
      await assignRole(kindeAPI, userId, orgId, testRoleId, "Test");
    } else {
      console.log("User already has Test role");
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