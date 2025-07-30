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

interface AzureADClaims {
  groups?: string[];
  tid?: string;
}

export default async function handlePostAuth(event: onPostAuthenticationEvent) {
  console.log("onPostAuthentication", event);

  // Extract Azure AD groups and tenancyId from the event
  const claims = (event.context.auth as any).provider?.data?.idToken?.claims as AzureADClaims;
  const adGroups = claims?.groups || [];
  const tenancyId = claims?.tid;
  const userId = event.context.user.id;

  // Get environment variables
  const EXTRAORDINARY_BASE_URL = getEnvironmentVariable("EXTRAORDINARY_BASE_URL")?.value;
  const EXTRAORDINARY_API_KEY = getEnvironmentVariable("EXTRAORDINARY_API_KEY")?.value;
  const AIRNZ_TENANCY_ID = getEnvironmentVariable("AIRNZ_TENANCY_ID")?.value;
  const AIRNZ_EMPLOYER_GROUP_ID = getEnvironmentVariable("AIRNZ_EMPLOYER_GROUP_ID")?.value;
  const AIRNZ_EMPLOYEE_GROUP_ID = getEnvironmentVariable("AIRNZ_EMPLOYEE_GROUP_ID")?.value;
  const EMPLOYEE_ROLE_ID = getEnvironmentVariable("EMPLOYEE_ROLE_ID")?.value;
  const EMPLOYER_ROLE_ID = getEnvironmentVariable("EMPLOYER_ROLE_ID")?.value;
  const AIRNZ_KINE_ORG_ID = getEnvironmentVariable("AIRNZ_KINE_ORG_ID")?.value;

  // Check if tenancyId matches AIRNZ_TENANCY_ID
  if (tenancyId !== AIRNZ_TENANCY_ID) {
    return;
  }

  console.log("Processing AirNZ user authentication");

  // Get Kinde API instance
  const kindeAPI = await createKindeAPI(event);

  // Get user details
  const { data: user } = await kindeAPI.get({
    endpoint: `user?id=${userId}&expand=organizations`,
  });
  console.log("User Response:", user);

  // Get organization details
  const { data: organization } = await kindeAPI.get({
    endpoint: `organization?code=${AIRNZ_KINE_ORG_ID}`,
  });
  console.log("Organization Response:", organization);

  const isNewKindeUser = event.context.auth.isNewUserRecordCreated;

  // Step 1: Ensure user is assigned to organization
  await ensureUserInOrganization(kindeAPI, userId, user, organization, AIRNZ_KINE_ORG_ID, isNewKindeUser, EXTRAORDINARY_BASE_URL, EXTRAORDINARY_API_KEY);

  // Step 2: Manage role assignments within the organization
  await manageUserRoles(kindeAPI, userId, adGroups, AIRNZ_KINE_ORG_ID, AIRNZ_EMPLOYER_GROUP_ID, AIRNZ_EMPLOYEE_GROUP_ID, EMPLOYER_ROLE_ID, EMPLOYEE_ROLE_ID, isNewKindeUser);
}

async function ensureUserInOrganization(
  kindeAPI: any,
  userId: string,
  user: any,
  organization: any,
  orgId: string,
  isNewUser: boolean,
  extraordinaryBaseUrl: string,
  extraordinaryApiKey: string
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
  }

  // If this is a new user, create them in Extraordinary system
  if (isNewUser) {
    console.log("Provisioning new user in Extraordinary system");
    
    const userData = {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.preferred_email,
      employerId: organization.external_id,
      kindeUserId: userId,
    };

    const response = await fetch(
      `${extraordinaryBaseUrl}/api/users-provisioning`,
      {
        method: "POST",
        headers: {
          "X-KINDE-KEY": extraordinaryApiKey,
          "Content-Type": "application/json",
        },
        body: userData,
      }
    );
    const employee = response.data;

    console.log('Extraordinary API Response:', {
      status: response.status,
      data: response.data
    });

    // Add employeeId property to user
    const propertyResponse = await kindeAPI.put({
      endpoint: `users/${userId}/properties/employee_id?value=${employee.id}`
    });
    console.log("Kinde API - Update Property Response:", propertyResponse);
  }
}

async function manageUserRoles(
  kindeAPI: any,
  userId: string,
  adGroups: string[],
  orgId: string,
  employerGroupId: string,
  employeeGroupId: string,
  employerRoleId: string,
  employeeRoleId: string,
  isNewUser: boolean
) {
  console.log("Managing user roles within organization");

  // Determine user's group memberships
  const isEmployer = adGroups.includes(employerGroupId);
  const isEmployee = adGroups.includes(employeeGroupId);

  console.log("User role assignments:", { isEmployer, isEmployee });

  if (isNewUser) {
    // For new users, simply assign roles based on AD groups
    await assignRoleIfNeeded(kindeAPI, userId, orgId, employerRoleId, isEmployer, "Employer");
    await assignRoleIfNeeded(kindeAPI, userId, orgId, employeeRoleId, isEmployee, "Employee");
  } else {
    // For existing users, get current roles and sync with AD groups
    const { data: userRolesData } = await kindeAPI.get({
      endpoint: `organizations/${orgId}/users/${userId}/roles`,
    });
    const userRoles = userRolesData?.roles || [];
    console.log("Current User Roles:", userRoles);

    // Manage Employer role
    await syncUserRole(kindeAPI, userId, orgId, employerRoleId, isEmployer, userRoles, "Employer");
    
    // Manage Employee role
    await syncUserRole(kindeAPI, userId, orgId, employeeRoleId, isEmployee, userRoles, "Employee");
  }
}

async function assignRoleIfNeeded(
  kindeAPI: any,
  userId: string,
  orgId: string,
  roleId: string,
  shouldAssign: boolean,
  roleName: string
) {
  if (shouldAssign) {
    console.log(`Assigning ${roleName} role to user`);
    const addRoleResponse = await kindeAPI.post({
      endpoint: `organizations/${orgId}/users/${userId}/roles`,
      body: { role_id: roleId },
    });
    console.log(`Kinde API - Add ${roleName} Role Response:`, addRoleResponse);
  }
}

async function syncUserRole(
  kindeAPI: any,
  userId: string,
  orgId: string,
  roleId: string,
  shouldHaveRole: boolean,
  currentRoles: any[],
  roleName: string
) {
  const userHasRole = currentRoles.some((role: any) => role.id === roleId);

  if (shouldHaveRole && !userHasRole) {
    // Add role
    console.log(`Adding ${roleName} role to user`);
    const addRoleResponse = await kindeAPI.post({
      endpoint: `organizations/${orgId}/users/${userId}/roles`,
      body: { role_id: roleId },
    });
    console.log(`Kinde API - Add ${roleName} Role Response:`, addRoleResponse);
  } else if (!shouldHaveRole && userHasRole) {
    // Remove role
    console.log(`Removing ${roleName} role from user`);
    const removeRoleResponse = await kindeAPI.delete({
      endpoint: `organizations/${orgId}/users/${userId}/roles/${roleId}`,
    });
    console.log(`Kinde API - Remove ${roleName} Role Response:`, removeRoleResponse);
  }
}







