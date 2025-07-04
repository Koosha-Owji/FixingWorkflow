import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
  accessTokenCustomClaims,
} from "@kinde/infrastructure";

// The setting for this workflow - matching customer's configuration
export const workflowSettings: WorkflowSettings = {
  id: "onUserTokenGeneration",
  name: "Custom Access Token Workflow",
  trigger: WorkflowTrigger.UserTokenGeneration,
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.accessToken": {},
    "kinde.fetch": {},
    "kinde.env": {},
    url: {},
  },
};

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: onUserTokenGeneratedEvent) {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting Custom Access Token Workflow");
    console.log(`⏰ Start time: ${new Date().toISOString()}`);
    
    // Log environment details
    console.log(`🏢 Domain: ${event.context.domains.kindeDomain}`);
    console.log(`📋 Org code: ${event.context.organization.code}`);
    
    // Create Kinde API instance using M2M credentials
    console.log("🔑 Creating Kinde API instance...");
    const apiCreateStart = Date.now();
    
    const kindeAPI = await createKindeAPI(event);
    
    const apiCreateDuration = Date.now() - apiCreateStart;
    console.log(`✅ Kinde API created in ${apiCreateDuration}ms`);
    
    const orgCode = event.context.organization.code;
    console.log(`🔍 Fetching organization data for code: ${orgCode}`);
    
    // Make API call to get organization data
    const apiCallStart = Date.now();
    
    const { data: org } = await kindeAPI.get({
      endpoint: `organization?code=${orgCode}`,
    });
    
    const apiCallDuration = Date.now() - apiCallStart;
    console.log(`📊 API call completed in ${apiCallDuration}ms`);
    
    // Check for errors in response (customer's issue)
    if ((org as any)?.errors) {
      console.error("❌ CUSTOMER ERROR DETECTED in API response:");
      console.error(JSON.stringify((org as any).errors, null, 2));
      
      // Log error analysis
      const hasInvalidCredentials = (org as any).errors.some((e: any) => e.code === "INVALID_CREDENTIALS");
      const hasTokenInvalid = (org as any).errors.some((e: any) => e.code === "TOKEN_INVALID");
      const hasBase64Error = (org as any).errors.some((e: any) => e.message?.includes("illegal base64 data"));
      
      console.log(`🔍 Error analysis: InvalidCredentials=${hasInvalidCredentials}, TokenInvalid=${hasTokenInvalid}, Base64Error=${hasBase64Error}`);
      
      // Don't throw yet - let's see if we can still set access token
    } else {
      console.log(`✅ Organization found: ${(org as any).name || 'Unknown'} (handle: ${(org as any).handle || 'null'})`);
    }

    // Create custom access token claims
    console.log("🎫 Creating custom access token claims...");
    
    const accessToken = accessTokenCustomClaims<{
      org_slug: string;
    }>();

    // Add the organization handle to the access token
    if (!(org as any)?.errors) {
      accessToken.org_slug = (org as any).handle;
      console.log(`✅ Added org_slug: ${(org as any).handle}`);
    } else {
      console.log("⚠️ Skipping org_slug due to API errors");
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`🎉 Workflow completed successfully in ${totalDuration}ms`);
    console.log(`⏰ End time: ${new Date().toISOString()}`);
    
    // If we had API errors, throw them now (after logging everything)
    if ((org as any)?.errors) {
      throw new Error(`API returned errors: ${JSON.stringify((org as any).errors)}`);
    }
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Error in Custom Access Token Workflow (after ${totalDuration}ms):`);
    console.error(`⏰ Error time: ${new Date().toISOString()}`);
    
    // Log detailed error information to help debug the credential issue
    if (error instanceof Error) {
      console.error(`🚨 Error message: ${error.message}`);
      console.error(`📍 Error type: ${error.constructor.name}`);
      
      // Check for specific error patterns
      if (error.message.includes("illegal base64 data")) {
        console.error("🔍 BASE64 CORRUPTION DETECTED - likely token cache issue");
      }
      if (error.message.includes("INVALID_CREDENTIALS")) {
        console.error("🔍 INVALID CREDENTIALS - likely token expiration/refresh issue");
      }
      if (error.message.includes("TOKEN_INVALID")) {
        console.error("🔍 TOKEN INVALID - likely token validation/corruption issue");
      }
      
      console.error(`📚 Error stack: ${error.stack}`);
    } else {
      console.error(`🔍 Non-Error object thrown: ${JSON.stringify(error)}`);
    }
    
    // Re-throw the error to trigger the failure policy
    throw error;
  }
} 