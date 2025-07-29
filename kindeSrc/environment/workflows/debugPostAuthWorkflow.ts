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
  
  // External API variables
  const EXTRAORDINARY_BASE_URL = getEnvironmentVariable("EXTRAORDINARY_BASE_URL")?.value;
  const EXTRAORDINARY_API_KEY = getEnvironmentVariable("EXTRAORDINARY_API_KEY")?.value;

  console.log("TEST_ROLE_ID:", TEST_ROLE_ID);
  console.log("TEST_ORG_ID:", TEST_ORG_ID);
  console.log("AIRNZ_TENANCY_ID:", AIRNZ_TENANCY_ID);
  console.log("EMPLOYER_ROLE_ID:", EMPLOYER_ROLE_ID);
  console.log("EMPLOYEE_ROLE_ID:", EMPLOYEE_ROLE_ID);
  console.log("EXTRAORDINARY_BASE_URL:", EXTRAORDINARY_BASE_URL);
  console.log("EXTRAORDINARY_API_KEY set:", !!EXTRAORDINARY_API_KEY);
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

  const isNewKindeUser = event.context.auth.isNewUserRecordCreated;
  console.log("Is New Kinde User:", isNewKindeUser);

  // The user has been added to the Kinde user pool for the first time (or always for testing)
  if (isNewKindeUser || true) {
    console.log("Provisioning new user...");
    
    // Test external API call (if configured)
    if (EXTRAORDINARY_BASE_URL && EXTRAORDINARY_API_KEY) {
      console.log("Making external API call...");
      try {
        const userData = {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.preferred_email,
          employerId: organization.external_id,
          kindeUserId: userId,
        };

        console.log("External API payload:", JSON.stringify(userData, null, 2));

        const response = await fetch(
          `${EXTRAORDINARY_BASE_URL}/api/users-provisioning`,
          {
            method: "POST",
            responseFormat: "json",
            headers: {
              "X-KINDE-KEY": `${EXTRAORDINARY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: userData,
          }
        );
        
        console.log("External API Response:", JSON.stringify(response, null, 2));
        const employee = response.data;

        if (employee?.id) {
          console.log("Setting user property...");
          // Add employeeId property to user
          const propertyResponse = await kindeAPI.put({
            endpoint: `users/${userId}/properties/employee_id?value=${employee.id}`
          });
          console.log("User Property Response:", JSON.stringify(propertyResponse, null, 2));
        }
      } catch (externalError) {
        console.error("External API call failed:", externalError);
      }
    } else {
      console.log("External API not configured, skipping");
    }

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
}