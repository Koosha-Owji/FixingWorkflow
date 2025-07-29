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
    console.log("Starting role assignment workflow for user:", userId);
    
    // Get Kinde API instance (will use KINDE_WF_M2M_CLIENT_ID and KINDE_WF_M2M_CLIENT_SECRET)
    const kindeAPI = await createKindeAPI(event, { skipCache: true });
    
    // Get user details with organizations expanded
    const { data: user } = await kindeAPI.get({
      endpoint: `user?id=${userId}&expand=organizations`,
    });
    
    // Check if organizations exist
    if (user?.organizations && user.organizations.length > 0) {
      console.log(`User belongs to ${user.organizations.length} organization(s)`);
      
      // Try role assignment with both organizations
      for (let orgIndex = 0; orgIndex < user.organizations.length; orgIndex++) {
        const orgCode = user.organizations[orgIndex];
        
        console.log(`Attempting role assignment in organization: ${orgCode}`);
        
        try {
          // Fetch all available roles
          const { data: rolesData } = await kindeAPI.get({
            endpoint: `roles`,
          });
          
          // Find the Test role
          const testRole = rolesData?.roles?.find((role: any) => role.key === "Test");
          if (testRole) {
            console.log(`Found Test role (${testRole.id})`);
            
            // Check if user already has this role in this organization
            const { data: userRolesData } = await kindeAPI.get({
              endpoint: `organizations/${orgCode}/users/${userId}/roles`,
            });
            
            const hasRole = userRolesData?.roles?.some((role: any) => role.id === testRole.id);
            
            if (!hasRole) {
              // Assign the Test role
              const addRoleResponse = await kindeAPI.post({
                endpoint: `organizations/${orgCode}/users/${userId}/roles`,
                params: { "role_id": testRole.id },
              });
              
              // Check if this organization worked
              if (!addRoleResponse.data?.errors) {
                console.log(`✅ Successfully assigned Test role to user in organization: ${orgCode}`);
                return user; // Exit on success
              } else {
                console.log(`❌ Failed to assign role in organization: ${orgCode}`);
                if (addRoleResponse.data?.errors) {
                  addRoleResponse.data.errors.forEach((error: any) => {
                    console.error(`Error: ${error.code} - ${error.message}`);
                  });
                }
              }
            } else {
              console.log(`User already has Test role in organization: ${orgCode}`);
            }
          } else {
            console.log("Test role not found in available roles");
          }
        } catch (roleError) {
          console.error(`Error processing role assignment for ${orgCode}:`, roleError);
        }
      }
    } else {
      console.log("User is not a member of any organizations");
    }
    
    return user;
    
  } catch (error) {
    console.error("Error in role assignment workflow:", error);
    throw error;
  }
}

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent
) {
  if (event.context?.user?.id) {
    try {
      await getUserWithOrganizations(event.context.user.id, event);
    } catch (error) {
      console.error("Role assignment workflow failed:", error);
    }
  }
} 