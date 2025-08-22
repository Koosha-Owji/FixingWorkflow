type WorkflowSettings = {
  id: string;
  name: string;
  trigger: string;
  failurePolicy?: { action: string };
  bindings?: Record<string, any>;
};

type OnNewPasswordProvidedEvent = {
  context: {
    auth: {
      firstPassword: string;
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
  
  // Password validation rules
  const isMinLength = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const isValidPassword = isMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  if (!isValidPassword) {
    // Custom form validation with comprehensive error message
    (globalThis as any).invalidateFormField?.(
      "p_first_password",
      `Password must be at least 12 characters long and
       include uppercase and lowercase letters, a number and a symbol ${password}`
    );
  }
}


