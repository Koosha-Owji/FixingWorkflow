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
    console.log(`🔍 Making MULTIPLE API calls to trigger token reuse issue...`);
    
    // FIRST API CALL - Should work (customer pattern)
    console.log(`🔍 [CALL 1] Fetching organization data for code: ${orgCode}`);
    const apiCall1Start = Date.now();
    
    const { data: org1 } = await kindeAPI.get({
      endpoint: `organization?code=${orgCode}`,
    });
    
    const apiCall1Duration = Date.now() - apiCall1Start;
    console.log(`📊 [CALL 1] API call completed in ${apiCall1Duration}ms`);
    
    // Check for errors in first response
    if ((org1 as any)?.errors) {
      console.error("❌ [CALL 1] CUSTOMER ERROR DETECTED in API response:");
      console.error(JSON.stringify((org1 as any).errors, null, 2));
    } else {
      console.log(`✅ [CALL 1] Organization found: ${(org1 as any).name || 'Unknown'} (handle: ${(org1 as any).handle || 'null'})`);
    }

    // SECOND API CALL - Where customer's issue typically occurs
    console.log(`🔍 [CALL 2] Making second API call (where corruption typically occurs)...`);
    const apiCall2Start = Date.now();
    
    const { data: org2 } = await kindeAPI.get({
      endpoint: `organization?code=${orgCode}`,
    });
    
    const apiCall2Duration = Date.now() - apiCall2Start;
    console.log(`📊 [CALL 2] API call completed in ${apiCall2Duration}ms`);
    
    // Check for errors in second response (customer's issue point)
    if ((org2 as any)?.errors) {
      console.error("❌ [CALL 2] CUSTOMER ERROR DETECTED in API response:");
      console.error(JSON.stringify((org2 as any).errors, null, 2));
      
      // Log error analysis
      const hasInvalidCredentials = (org2 as any).errors.some((e: any) => e.code === "INVALID_CREDENTIALS");
      const hasTokenInvalid = (org2 as any).errors.some((e: any) => e.code === "TOKEN_INVALID");
      const hasBase64Error = (org2 as any).errors.some((e: any) => e.message?.includes("illegal base64 data"));
      
      console.log(`🔍 [CALL 2] Error analysis: InvalidCredentials=${hasInvalidCredentials}, TokenInvalid=${hasTokenInvalid}, Base64Error=${hasBase64Error}`);
      
      // This is the customer's exact issue - let's continue to see if we can still set access token
    } else {
      console.log(`✅ [CALL 2] Organization found: ${(org2 as any).name || 'Unknown'} (handle: ${(org2 as any).handle || 'null'})`);
    }

    // THIRD API CALL - To further test token reuse
    console.log(`🔍 [CALL 3] Making third API call to test token stability...`);
    const apiCall3Start = Date.now();
    
    const { data: org3 } = await kindeAPI.get({
      endpoint: `organization?code=${orgCode}`,
    });
    
    const apiCall3Duration = Date.now() - apiCall3Start;
    console.log(`📊 [CALL 3] API call completed in ${apiCall3Duration}ms`);
    
    // Check for errors in third response
    if ((org3 as any)?.errors) {
      console.error("❌ [CALL 3] CUSTOMER ERROR DETECTED in API response:");
      console.error(JSON.stringify((org3 as any).errors, null, 2));
    } else {
      console.log(`✅ [CALL 3] Organization found: ${(org3 as any).name || 'Unknown'} (handle: ${(org3 as any).handle || 'null'})`);
    }

    // Create custom access token claims
    console.log("🎫 Creating custom access token claims...");
    
    const accessToken = accessTokenCustomClaims<{
      org_slug: string;
    }>();

    // Use the first successful org response (customer's pattern)
    let orgHandle = null;
    if (!(org1 as any)?.errors) {
      orgHandle = (org1 as any).handle;
    } else if (!(org2 as any)?.errors) {
      orgHandle = (org2 as any).handle;
    } else if (!(org3 as any)?.errors) {
      orgHandle = (org3 as any).handle;
    }

    if (orgHandle) {
      accessToken.org_slug = orgHandle;
      console.log(`✅ Added org_slug: ${orgHandle}`);
    } else {
      console.log("⚠️ Skipping org_slug due to API errors in all calls");
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`🎉 Workflow completed successfully in ${totalDuration}ms`);
    console.log(`⏰ End time: ${new Date().toISOString()}`);
    
    // If ALL calls had errors, throw them now (after logging everything)
    if ((org1 as any)?.errors && (org2 as any)?.errors && (org3 as any)?.errors) {
      throw new Error(`All API calls returned errors. Last error: ${JSON.stringify((org3 as any).errors)}`);
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