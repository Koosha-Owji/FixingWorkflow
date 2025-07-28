import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
  secureFetch,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.env": {},
    "kinde.fetch": {},
    "kinde.secureFetch": {},
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
      
      // Try role assignment with both organizations
      for (let orgIndex = 0; orgIndex < user.organizations.length; orgIndex++) {
        const orgCode = user.organizations[orgIndex];
        
        console.log(`=== ROLE ASSIGNMENT - ORGANIZATION ${orgIndex + 1} ===`);
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
            
            // Check if user already has this role in this organization
            try {
              const { data: userRolesData } = await kindeAPI.get({
                endpoint: `organizations/${orgCode}/users/${userId}/roles`,
              });
              console.log(`User's current roles in ${orgCode}:`, JSON.stringify(userRolesData, null, 2));
              
              const hasRole = userRolesData?.roles?.some((role: any) => role.id === testRole.id);
              console.log("User already has Test role in this org:", hasRole);
              
              if (!hasRole) {
                console.log(`=== ATTEMPTING ROLE ASSIGNMENT IN ${orgCode} ===`);
                console.log("Role ID being sent:", testRole.id);
                console.log("Org Code:", orgCode);
                console.log("User ID:", userId);
                
                // Try regular kindeAPI approach
                const addRoleResponse = await kindeAPI.post({
                  endpoint: `organizations/${orgCode}/users/${userId}/roles`,
                  body: { "role_id": testRole.id },
                });
                
                console.log(`=== ROLE ASSIGNMENT RESULT FOR ${orgCode} ===`);
                console.log("Response status:", addRoleResponse.status);
                console.log("Full response:", JSON.stringify(addRoleResponse, null, 2));
                
                // Check if this organization worked
                if (!addRoleResponse.data?.errors) {
                  console.log(`🎉 SUCCESS! Role assigned in organization: ${orgCode}`);
                  return user; // Exit early on success
                } else {
                  console.log(`❌ Failed in organization: ${orgCode}`);
                  if (addRoleResponse.data?.errors) {
                    addRoleResponse.data.errors.forEach((error: any, index: number) => {
                      console.log(`Error ${index + 1}:`, error);
                    });
                  }
                }
              } else {
                console.log(`User already has the Test role in ${orgCode}, skipping assignment`);
              }
            } catch (roleError) {
              console.error(`Error in role assignment for ${orgCode}:`, roleError);
            }
          } else {
            console.log("Test role not found in available roles");
          }
        } catch (rolesError) {
          console.error("Error fetching roles:", rolesError);
        }
        
        console.log(`=== END OF ATTEMPT FOR ${orgCode} ===\n`);
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