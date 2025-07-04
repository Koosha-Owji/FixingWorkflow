import {
  onUserTokenGeneratedEvent,
  WorkflowSettings,
  WorkflowTrigger,
  createKindeAPI,
  accessTokenCustomClaims,
  getM2MToken,
} from "@kinde/infrastructure";

// The setting for this workflow - matching customer's configuration
export const workflowSettings: WorkflowSettings = {
  id: "debugTokenGeneration",
  name: "Debug Token Generation Workflow",
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

// Helper function to safely stringify objects
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return `[Stringify Error: ${error.message}]`;
  }
}

// Helper function to create detailed logs
function debugLog(stage: string, data: any) {
  console.log(`🔍 [DEBUG-${stage}] ${safeStringify(data)}`);
}

// The workflow code to be executed when the event is triggered
export default async function DebugWorkflow(event: onUserTokenGeneratedEvent) {
  const startTime = Date.now();
  
  try {
    debugLog("WORKFLOW_START", {
      timestamp: new Date().toISOString(),
      eventType: event.context.workflow.trigger,
      orgCode: event.context.organization?.code,
      userId: event.context.user?.id,
      domain: event.context.domains?.kindeDomain,
    });

    // Step 1: Test direct token creation
    debugLog("STEP_1_START", "Testing direct M2M token creation");
    
    try {
      const directToken = await getM2MToken("debug_direct_token", {
        domain: event.context.domains.kindeDomain,
        clientId: "test_client_id", // This will fail but we can see the error
        clientSecret: "test_client_secret",
        audience: [`${event.context.domains.kindeDomain}/api`],
      });
      
      debugLog("STEP_1_SUCCESS", {
        directTokenLength: directToken?.length,
        directTokenPrefix: directToken?.substring(0, 20),
      });
    } catch (directError) {
      debugLog("STEP_1_ERROR", {
        error: directError.message,
        stack: directError.stack,
      });
    }

    // Step 2: Test createKindeAPI with detailed logging
    debugLog("STEP_2_START", "Creating Kinde API with debugging");
    
    const kindeAPI = await createKindeAPI(event);
    
    debugLog("STEP_2_SUCCESS", {
      apiCreated: !!kindeAPI,
      apiMethods: Object.keys(kindeAPI || {}),
    });

    // Step 3: Test organization API call with timing
    const orgCode = event.context.organization?.code;
    
    debugLog("STEP_3_START", {
      orgCode,
      endpoint: `organization?code=${orgCode}`,
    });

    const apiCallStart = Date.now();
    
    try {
      const { data: org } = await kindeAPI.get({
        endpoint: `organization?code=${orgCode}`,
      });

      const apiCallDuration = Date.now() - apiCallStart;
      
      debugLog("STEP_3_SUCCESS", {
        duration: apiCallDuration,
        responseType: typeof org,
        hasErrors: !!(org as any)?.errors,
        orgData: org,
      });

      // Step 4: Check if response contains errors (customer's issue)
      if ((org as any)?.errors) {
        debugLog("CUSTOMER_ERROR_DETECTED", {
          errors: (org as any).errors,
          isInvalidCredentials: (org as any).errors.some((e: any) => 
            e.code === "INVALID_CREDENTIALS"
          ),
          isTokenInvalid: (org as any).errors.some((e: any) => 
            e.code === "TOKEN_INVALID"
          ),
        });
        
        // Don't throw - let's continue to see what happens
      }

      // Step 5: Test access token modification
      debugLog("STEP_5_START", "Testing access token modification");
      
      const accessToken = accessTokenCustomClaims<{
        org_slug: string;
        debug_info: any;
      }>();

      if (!(org as any)?.errors) {
        accessToken.org_slug = (org as any).handle;
      }
      
      // Add debug information to the token
      accessToken.debug_info = {
        workflow_execution_time: Date.now() - startTime,
        token_refresh_tested: true,
        org_api_call_duration: apiCallDuration,
        timestamp: new Date().toISOString(),
      };
      
      debugLog("STEP_5_SUCCESS", {
        tokenClaims: {
          org_slug: accessToken.org_slug,
          debug_info: accessToken.debug_info,
        },
      });

    } catch (orgError) {
      debugLog("STEP_3_ERROR", {
        error: orgError.message,
        stack: orgError.stack,
        duration: Date.now() - apiCallStart,
      });
      
      // Check if this is the customer's specific error
      if (orgError.message.includes("illegal base64 data")) {
        debugLog("CUSTOMER_BASE64_ERROR", {
          exactError: orgError.message,
          possibleCause: "Cache corruption or token validation failure",
        });
      }
      
      if (orgError.message.includes("INVALID_CREDENTIALS")) {
        debugLog("CUSTOMER_CREDENTIALS_ERROR", {
          exactError: orgError.message,
          possibleCause: "Token expired and refresh failed",
        });
      }
      
      throw orgError;
    }

    const totalDuration = Date.now() - startTime;
    
    debugLog("WORKFLOW_SUCCESS", {
      totalDuration,
      success: true,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    
    debugLog("WORKFLOW_ERROR", {
      error: error.message,
      stack: error.stack,
      totalDuration,
      timestamp: new Date().toISOString(),
    });
    
    // Add error details to access token for debugging
    try {
      const accessToken = accessTokenCustomClaims<{
        debug_error: any;
      }>();
      
      accessToken.debug_error = {
        message: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
      };
      
      debugLog("ERROR_ADDED_TO_TOKEN", {
        errorDetails: accessToken.debug_error,
      });
    } catch (tokenError) {
      debugLog("TOKEN_ERROR_LOGGING_FAILED", {
        tokenError: tokenError.message,
        originalError: error.message,
      });
    }
    
    // Re-throw the error to trigger the failure policy
    throw error;
  }
}

// Export a function to manually test token operations
export async function testTokenOperations(event: onUserTokenGeneratedEvent) {
  console.log("🧪 Manual Token Operations Test");
  
  try {
    // Test 1: Direct token fetch
    console.log("Test 1: Direct token fetch");
    const token = await getM2MToken("manual_test_token", {
      domain: event.context.domains.kindeDomain,
      clientId: "test_client_id",
      clientSecret: "test_client_secret", 
      audience: [`${event.context.domains.kindeDomain}/api`],
    });
    console.log("✅ Direct token fetch successful", { tokenLength: token.length });
    
    // Test 2: API creation
    console.log("Test 2: API creation");
    const api = await createKindeAPI(event);
    console.log("✅ API creation successful");
    
    // Test 3: Simple API call
    console.log("Test 3: Simple API call");
    const result = await api.get({ endpoint: "applications" });
    console.log("✅ API call successful", { hasData: !!result.data });
    
    return { success: true, tests: 3 };
    
  } catch (error) {
    console.log("❌ Manual test failed:", error.message);
    return { success: false, error: error.message };
  }
} 