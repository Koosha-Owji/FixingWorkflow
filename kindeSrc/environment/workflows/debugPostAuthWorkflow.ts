import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
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
    
    // Get Kinde API instance (will use KINDE_WF_M2M_CLIENT_ID and KINDE_WF_M2M_CLIENT_SECRET)
    const kindeAPI = await createKindeAPI(event);
    
    // Get user details with organizations expanded
    const { data: user } = await kindeAPI.get({
      endpoint: `user?id=${userId}&expand=organizations`,
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
      const orgCode = user.organizations[0];
      
      if (orgCode) {
        console.log("=== ROLE ASSIGNMENT ===");
        console.log("Using organization code:", orgCode);
        
        // Fetch all available roles
        try {
          console.log("=== FETCHING AVAILABLE ROLES ===");
          const { data: rolesData } = await kindeAPI.get({
            endpoint: `roles`,
          });
          console.log("Available roles:", JSON.stringify(rolesData, null, 2));
          
          // Find the Test role
          const testRole = rolesData?.roles?.find((role: any) => role.key === "Test");
          if (testRole) {
            console.log("=== ASSIGNING TEST ROLE ===");
            console.log("Using Test role ID:", testRole.id);
            console.log("Role name:", testRole.name);
            
            // Check if user already has this role
            try {
              const { data: userRolesData } = await kindeAPI.get({
                endpoint: `organizations/${orgCode}/users/${userId}/roles`,
              });
              console.log("User's current roles:", JSON.stringify(userRolesData, null, 2));
              
              const hasRole = userRolesData?.roles?.some((role: any) => role.id === testRole.id);
              console.log("User already has Test role:", hasRole);
              
              if (!hasRole) {
                // Assign the Test role
                console.log("=== PREPARING ROLE ASSIGNMENT REQUEST ===");
                console.log("Endpoint:", `organizations/${orgCode}/users/${userId}/roles`);
                console.log("Method: POST");
                console.log("Body:", JSON.stringify({ "role_id": testRole.id }, null, 2));
                console.log("Role ID being sent:", testRole.id);
                console.log("Org Code:", orgCode);
                console.log("User ID:", userId);
                
                const addRoleResponse = await kindeAPI.post({
                  endpoint: `organizations/${orgCode}/users/${userId}/roles`,
                  body: { "role_id": testRole.id },
                });
                console.log("=== ROLE ASSIGNMENT RESULT ===");
                console.log("Response status:", addRoleResponse.status);
                console.log("Full response:", JSON.stringify(addRoleResponse, null, 2));
                
                // Check if there are errors in the response
                if (addRoleResponse.data?.errors) {
                  console.log("=== API RETURNED ERRORS ===");
                  addRoleResponse.data.errors.forEach((error: any, index: number) => {
                    console.log(`Error ${index + 1}:`, error);
                  });
                }
              } else {
                console.log("User already has the Test role, skipping assignment");
              }
            } catch (roleError) {
              console.error("Error in role assignment:", roleError);
            }
          } else {
            console.log("Test role not found in available roles");
          }
        } catch (rolesError) {
          console.error("Error fetching roles:", rolesError);
        }
      }
    } else {
      console.log("=== NO ORGANIZATIONS FOUND ===");
      console.log("User is not a member of any organizations");
    }
    
    return user;
    
  } catch (error) {
    console.error("=== ERROR FETCHING USER DATA ===");
    console.error("Error:", error);
    throw error;
  }
}

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent
) {
  console.log("=== POST AUTHENTICATION EVENT ===");
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  if (event.context?.user?.id) {
    try {
      console.log("Fetching detailed user data with organizations...");
      await getUserWithOrganizations(event.context.user.id, event);
    } catch (error) {
      console.error("Failed to fetch detailed user data:", error);
    }
  }
} 