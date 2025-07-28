import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
  getEnvironmentVariable,
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
      
      // Get the first organization for role assignment
      const orgCode = user.organizations[0]; // organizations are strings, not objects
      
      if (orgCode) {
        console.log("=== ROLE ASSIGNMENT ===");
        console.log("Using organization code:", orgCode);
        
                  // First, let's fetch all available roles to see what's available
          let roleId = null;
          try {
            console.log("=== FETCHING AVAILABLE ROLES ===");
            const { data: rolesData } = await kindeAPI.get({
              endpoint: `roles`,
            });
            console.log("Available roles:", JSON.stringify(rolesData, null, 2));
            
            // Show role IDs and keys for reference
            if (rolesData?.roles && rolesData.roles.length > 0) {
              console.log("=== ROLE IDS FOR REFERENCE ===");
              rolesData.roles.forEach((role: any) => {
                console.log(`Role: ${role.name || role.key} | ID: ${role.id} | Key: ${role.key}`);
              });
              
              // Use the first available role (or you could filter for a specific one)
              roleId = rolesData.roles[0].id;
              console.log("Using first available role ID:", roleId);
              console.log("Role name:", rolesData.roles[0].name || rolesData.roles[0].key);
            }
          } catch (rolesError) {
            console.error("Error fetching roles:", rolesError);
          }
        
        if (roleId) {
          // First, check if user already has this role
          try {
            console.log("=== CHECKING EXISTING USER ROLES ===");
            const { data: userRolesData } = await kindeAPI.get({
              endpoint: `organizations/${orgCode}/users/${userId}/roles`,
            });
            console.log("User's current roles:", JSON.stringify(userRolesData, null, 2));
            
            const hasRole = userRolesData?.roles?.some((role: any) => role.id === roleId);
            console.log("User already has this role:", hasRole);
            
            if (hasRole) {
              console.log("=== ROLE ALREADY ASSIGNED ===");
              console.log("User already has the role, skipping assignment");
              return user; // Skip the role assignment
            }
          } catch (checkRoleError) {
            console.error("Error checking user roles:", checkRoleError);
          }
          
          // Add user to role
          const addRoleEndpoint = `organizations/${orgCode}/users/${userId}/roles`;
          console.log("Role assignment endpoint:", addRoleEndpoint);
          
          try {
            const addRoleResponse = await kindeAPI.post({
              endpoint: addRoleEndpoint,
              body: { "role_id": roleId },
            });
            console.log("=== ROLE ASSIGNMENT SUCCESS ===");
            console.log("Add Role Response:", JSON.stringify(addRoleResponse, null, 2));
          } catch (roleError) {
            console.error("=== ROLE ASSIGNMENT ERROR ===");
            console.error("Role assignment failed:", roleError);
          }
        } else {
          console.log("No USER_ROLE_ID environment variable found - skipping role assignment");
        }
      }
      
      // If we want to get more details about the first organization
      const firstOrgCode = user.organizations[0]; // organizations are strings, not objects
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
      console.log("User is not a member of any organizations - cannot assign roles");
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