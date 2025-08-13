declare module "@kinde/infrastructure" {
  export const fetch: any;
  export function createKindeAPI(event: any): Promise<any>;
  export function getEnvironmentVariable(
    name: string
  ): { value?: string } | undefined;
  export function idTokenCustomClaims<T>(): T;

  export enum WorkflowTrigger {
    PostAuthentication = "user:post_authentication",
    UserTokenGeneration = "user:token",
  }

  export interface WorkflowSettings {
    id: string;
    name: string;
    failurePolicy?: { action: string };
    trigger: any;
    bindings?: Record<string, any>;
  }

  export type onPostAuthenticationEvent = any;
}


