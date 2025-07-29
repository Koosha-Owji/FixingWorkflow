import {
  onPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  getEnvironmentVariable,
  createKindeAPI,
} from "@kinde/infrastructure";

// The settings for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "postAuthentication",
  name: "Test Role Assignment",
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
  try {
    console.log("Starting role assignment test");

    const userId = event.context.user.id;

    // Get environment variables with safer access
    let TEST_ROLE_ID: string | undefined;
    let TEST_ORG_ID: string | undefined;

    try {
      TEST_ROLE_ID = getEnvironmentVariable("TEST_ROLE_ID")?.value;
      TEST_ORG_ID = getEnvironmentVariable("TEST_ORG_ID")?.value;
    } catch (envError) {
      console.error("Error accessing environment variables:", envError);
      return;
    }

    console.log("TEST_ROLE_ID:", TEST_ROLE_ID);
    console.log("TEST_ORG_ID:", TEST_ORG_ID);
    console.log("User ID:", userId);

    if (!TEST_ROLE_ID || !TEST_ORG_ID) {
      console.error("Missing environment variables: TEST_ROLE_ID or TEST_ORG_ID");
      return;
    }

    // Get Kinde API instance
    const kindeAPI = await createKindeAPI(event);

    // Get user details
    const { data: user } = await kindeAPI.get({
      endpoint: `user?id=${userId}&expand=organizations`,
    });
    console.log("User Response:", JSON.stringify(user, null, 2));

    // Get organization details
    const { data: organization } = await kindeAPI.get({
      endpoint: `organization?code=${TEST_ORG_ID}`,
    });
    console.log("Organization Response:", JSON.stringify(organization, null, 2));

    // Get user's current roles in the organization
    const { data: userRolesData } = await kindeAPI.get({
      endpoint: `organizations/${TEST_ORG_ID}/users/${userId}/roles`,
    });
    console.log("User Roles Response:", JSON.stringify(userRolesData, null, 2));

    // Check if user already has the role
    const userHasRole = userRolesData?.roles?.find((role: any) => role.id === TEST_ROLE_ID);

    if (!userHasRole) {
      console.log("Assigning role to user...");
      // Add role to user
      const addRoleResponse = await kindeAPI.post({
        endpoint: `organizations/${TEST_ORG_ID}/users/${userId}/roles`,
        params: { role_id: TEST_ROLE_ID },
      });
      console.log("Add Role Response:", JSON.stringify(addRoleResponse, null, 2));

      if (!addRoleResponse.data?.errors) {
        console.log("✅ Role assigned successfully");
      } else {
        console.log("❌ Role assignment failed");
      }
    } else {
      console.log("User already has the role");
    }
  } catch (error) {
    console.error("Workflow error:", error);
  }
}