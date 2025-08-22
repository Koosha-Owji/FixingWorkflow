type WorkflowSettings = {
  id: string;
  name: string;
  trigger: string;
  failurePolicy?: { action: string };
  bindings?: Record<string, any>;
};

// Helper to invalidate a specific field in Kinde runtime regardless of injection style
function invalidateField(fieldId: "p_first_password" | "p_second_password", message: string) {
  const maybeKinde = (globalThis as any).kinde;
  const invalidateViaWidget = maybeKinde?.widget?.invalidateFormField?.bind(
    maybeKinde.widget
  );
  const invalidateGlobal = (globalThis as any).invalidateFormField;

  if (typeof invalidateViaWidget === "function") {
    invalidateViaWidget(fieldId, message);
  } else if (typeof invalidateGlobal === "function") {
    invalidateGlobal(fieldId, message);
  }
}

type OnNewPasswordProvidedEvent = {
  context: {
    auth: {
      firstPassword: string;
      secondPassword?: string;
    };
  };
};

// The setting for this workflow
export const workflowSettings: WorkflowSettings = {
  id: "onNewPasswordProvided",
  name: "On new password provided",
  trigger: "user:new_password_provided",
  failurePolicy: {
    action: "stop",
  },
  bindings: {
    "kinde.widget": {}, // Required for accessing the UI
    "kinde.mfa": {},
  },
};

// The workflow code to be executed when the event is triggered
export default async function Workflow(event: OnNewPasswordProvidedEvent) {
  const password = event.context.auth.firstPassword;
  const confirmPassword = event.context.auth.secondPassword;
  
  // First: ensure passwords match if a confirmation is provided
  if (typeof confirmPassword === "string" && confirmPassword !== password) {
    invalidateField(
      "p_second_password",
      "Passwords must match."
    );
    return;
  }
  
  // Password validation rules
  const isMinLength = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const isValidPassword = isMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  if (!isValidPassword) {
    // Custom form validation with comprehensive error message
    invalidateField(
      "p_first_password",
      "Password must be at least 12 characters long and include uppercase and lowercase letters, a number and a symbol."
    );
    return;
  }
}


