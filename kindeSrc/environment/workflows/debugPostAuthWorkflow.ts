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

interface AzureADClaims {
  groups?: string[];
  tid?: string;
}

export default async function handlePostAuth(event: onPostAuthenticationEvent) {
  console.log("Starting role assignment test");

  // Extract Azure AD groups and tenancyId from the event
  const claims = (event.context.auth as any).provider?.data?.idToken?.claims as AzureADClaims;
  const adGroups = claims?.groups || [];
  const tenancyId = claims?.tid;
  const userId = event.context.user.id;

  console.log("Azure AD Claims:", JSON.stringify(claims, null, 2));
  console.log("AD Groups:", adGroups);
  console.log("Tenancy ID:", tenancyId);

  // Get environment variables
  const TEST_ROLE_ID = getEnvironmentVariable("TEST_ROLE_ID")?.value;
  const TEST_ORG_ID = getEnvironmentVariable("TEST_ORG_ID")?.value;
  const AIRNZ_TENANCY_ID = getEnvironmentVariable("AIRNZ_TENANCY_ID")?.value;
  const AIRNZ_EMPLOYER_GROUP_ID = getEnvironmentVariable("AIRNZ_EMPLOYER_GROUP_ID")?.value;
  const AIRNZ_EMPLOYEE_GROUP_ID = getEnvironmentVariable("AIRNZ_EMPLOYEE_GROUP_ID")?.value;
  const EMPLOYER_ROLE_ID = getEnvironmentVariable("EMPLOYER_ROLE_ID")?.value;
  const EMPLOYEE_ROLE_ID = getEnvironmentVariable("EMPLOYEE_ROLE_ID")?.value;

  console.log("TEST_ROLE_ID:", TEST_ROLE_ID);
  console.log("TEST_ORG_ID:", TEST_ORG_ID);
  console.log("AIRNZ_TENANCY_ID:", AIRNZ_TENANCY_ID);
  console.log("EMPLOYER_ROLE_ID:", EMPLOYER_ROLE_ID);
  console.log("EMPLOYEE_ROLE_ID:", EMPLOYEE_ROLE_ID);
  console.log("User ID:", userId);

  if (!TEST_ORG_ID) {
    console.error("Missing environment variable: TEST_ORG_ID");
    return;
  }

  // Check if tenancyId matches AIRNZ_TENANCY_ID (skip if not set for testing)
  if (AIRNZ_TENANCY_ID && tenancyId !== AIRNZ_TENANCY_ID) {
    console.log("Tenancy ID doesn't match, skipping");
    return;
  }

  console.log("Processing user...");

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

  const userRoles = userRolesData?.roles || [];

  // Test basic role assignment first
  if (TEST_ROLE_ID) {
    const userHasTestRole = userRoles.find((role: any) => role.id === TEST_ROLE_ID);
    if (!userHasTestRole) {
      console.log("Assigning test role...");
      const addTestRoleResponse = await kindeAPI.post({
        endpoint: `organizations/${TEST_ORG_ID}/users/${userId}/roles`,
        params: { role_id: TEST_ROLE_ID },
      });
      console.log("Add Test Role Response:", JSON.stringify(addTestRoleResponse, null, 2));
    } else {
      console.log("User already has test role");
    }
  }

  // Test employer role assignment
  if (EMPLOYER_ROLE_ID && AIRNZ_EMPLOYER_GROUP_ID) {
    const isEmployer = adGroups.includes(AIRNZ_EMPLOYER_GROUP_ID);
    const userHasEmployerRole = userRoles.find((role: any) => role.id === EMPLOYER_ROLE_ID);
    
    console.log("Is Employer:", isEmployer);
    console.log("User has Employer Role:", !!userHasEmployerRole);

    if (isEmployer && !userHasEmployerRole) {
      console.log("Assigning employer role...");
      const addEmployerResponse = await kindeAPI.post({
        endpoint: `organizations/${TEST_ORG_ID}/users/${userId}/roles`,
        params: { role_id: EMPLOYER_ROLE_ID },
      });
      console.log("Add Employer Role Response:", JSON.stringify(addEmployerResponse, null, 2));
    }
  }

  // Test employee role assignment
  if (EMPLOYEE_ROLE_ID && AIRNZ_EMPLOYEE_GROUP_ID) {
    const isEmployee = adGroups.includes(AIRNZ_EMPLOYEE_GROUP_ID);
    const userHasEmployeeRole = userRoles.find((role: any) => role.id === EMPLOYEE_ROLE_ID);
    
    console.log("Is Employee:", isEmployee);
    console.log("User has Employee Role:", !!userHasEmployeeRole);

    if (isEmployee && !userHasEmployeeRole) {
      console.log("Assigning employee role...");
      const addEmployeeResponse = await kindeAPI.post({
        endpoint: `organizations/${TEST_ORG_ID}/users/${userId}/roles`,
        params: { role_id: EMPLOYEE_ROLE_ID },
      });
      console.log("Add Employee Role Response:", JSON.stringify(addEmployeeResponse, null, 2));
    }
  }
}