declare module "@kinde/infrastructure" {
  export type onExistingPasswordProvidedEvent = {
    context: {
      auth: {
        hashedPassword: string;
        providedEmail: string;
        password: string;
        hasUserRecordInKinde: boolean;
      };
    };
  };

  export type WorkflowSettings = {
    id: string;
    trigger: any;
    failurePolicy?: { action: "stop" | "continue" };
    bindings?: Record<string, unknown>;
  };

  export const WorkflowTrigger: {
    ExistingPasswordProvided: any;
  };

  export function invalidateFormField(fieldId: string, message: string): void;

  export function getEnvironmentVariable(
    name: string
  ): { value?: string } | undefined;

  export function secureFetch(
    url: string,
    options: any
  ): Promise<{ data: any; status?: number }>;

  export const fetch: {
    post(args: { endpoint: string; params?: any }): Promise<{ data: any }>;
    put(args: { endpoint: string; params?: any }): Promise<{ data: any }>;
  };
}


