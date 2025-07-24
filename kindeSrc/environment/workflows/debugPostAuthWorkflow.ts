import {
  onUserPostAuthenticationEvent,
  WorkflowSettings,
  WorkflowTrigger,
} from "@kinde/infrastructure";

export const workflowSettings: WorkflowSettings = {
  id: "debugPostAuthWorkflow",
  name: "Debug Post Authentication Workflow",
  trigger: WorkflowTrigger.PostAuthentication,
  failurePolicy: { action: "stop" },
  bindings: {
    "kinde.auth": {},
    "kinde.fetch": {},
  },
};

async function getUserWithOrganizations(userId: string, token: string = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRkOjA4OjM0OjhmOjk1OjU1OjU3OmI4OmYxOmJiOjYxOmQxOjBhOjJmOmQxOmY3IiwidHlwIjoiSldUIn0.eyJhcHBsaWNhdGlvbl9wcm9wZXJ0aWVzIjp7ImtwX2FwcF9uYW1lIjp7fX0sImF1ZCI6WyJodHRwczovL2tvb3NoYW93amkua2luZGUuY29tL2FwaSJdLCJhenAiOiIxYTdhNGM4NWJmY2M0YjNjYWY3NzQwMDE0YTJjZmZlMyIsImV4cCI6MTc1MzM4OTI0OCwiZ3R5IjpbImNsaWVudF9jcmVkZW50aWFscyJdLCJpYXQiOjE3NTMzMjkyNDgsImlzcyI6Imh0dHBzOi8va29vc2hhb3dqaS5raW5kZS5jb20iLCJqdGkiOiJkODAxYTc2ZS04NDhlLTRmNWMtYjVlZi0xMGNkMjM2OGE5MTQiLCJwZXJtaXNzaW9ucyI6WyJjcmVhdGU6YXBpX2FwcGxpY2F0aW9uX3Njb3BlcyIsImNyZWF0ZTphcGlzIiwiY3JlYXRlOmFwaV9zY29wZXMiLCJjcmVhdGU6YXBwbGljYXRpb25fY29ubmVjdGlvbnMiLCJjcmVhdGU6YXBwbGljYXRpb25fbG9nb3V0X3VyaXMiLCJjcmVhdGU6YXBwbGljYXRpb25fcmVkaXJlY3RfdXJpcyIsImNyZWF0ZTphcHBsaWNhdGlvbnMiLCJjcmVhdGU6YmlsbGluZ19hZ3JlZW1lbnRzIiwiY3JlYXRlOmJpbGxpbmdfZW50aXRsZW1lbnRfY2hhbmdlX3JlcXVlc3RzIiwiY3JlYXRlOmJpbGxpbmdfcGF5bWVudF9tZXRob2RzIiwiY3JlYXRlOmNvbm5lY3RlZF9hcHBzIiwiY3JlYXRlOmNvbm5lY3Rpb25zIiwiY3JlYXRlOmVudmlyb25tZW50X3ZhcmlhYmxlcyIsImNyZWF0ZTpmZWF0dXJlX2ZsYWdzIiwiY3JlYXRlOm1ldGVyX3VzYWdlIiwiY3JlYXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyIsImNyZWF0ZTpvcmdhbml6YXRpb25zIiwiY3JlYXRlOm9yZ2FuaXphdGlvbl91c2VyX2FwaV9zY29wZXMiLCJjcmVhdGU6b3JnYW5pemF0aW9uX3VzZXJfcGVybWlzc2lvbnMiLCJjcmVhdGU6b3JnYW5pemF0aW9uX3VzZXJfcm9sZXMiLCJjcmVhdGU6b3JnYW5pemF0aW9uX3VzZXJzIiwiY3JlYXRlOnBlcm1pc3Npb25zIiwiY3JlYXRlOnByb3BlcnRpZXMiLCJjcmVhdGU6cHJvcGVydHlfY2F0ZWdvcmllcyIsImNyZWF0ZTpyb2xlcyIsImNyZWF0ZTpzdWJzY3JpYmVycyIsImNyZWF0ZTp1c2VyX2lkZW50aXRpZXMiLCJjcmVhdGU6dXNlcnMiLCJjcmVhdGU6d2ViaG9va3MiLCJkZWxldGU6YXBpX2FwcGxpY2F0aW9uX3Njb3BlcyIsImRlbGV0ZTphcGlzIiwiZGVsZXRlOmFwaV9zY29wZXMiLCJkZWxldGU6YXBwbGljYXRpb25fY29ubmVjdGlvbnMiLCJkZWxldGU6YXBwbGljYXRpb25fbG9nb3V0X3VyaXMiLCJkZWxldGU6YXBwbGljYXRpb25fcmVkaXJlY3RfdXJpcyIsImRlbGV0ZTphcHBsaWNhdGlvbnMiLCJkZWxldGU6YmlsbGluZ19hZ3JlZW1lbnRzIiwiZGVsZXRlOmJpbGxpbmdfcGF5bWVudF9tZXRob2RzIiwiZGVsZXRlOmNvbm5lY3Rpb25zIiwiZGVsZXRlOmVudmlyb25tZW50X2ZlYXR1cmVfZmxhZ3MiLCJkZWxldGU6ZW52aXJvbm1lbnRfdmFyaWFibGVzIiwiZGVsZXRlOmZlYXR1cmVfZmxhZ3MiLCJkZWxldGU6aWRlbnRpdGllcyIsImRlbGV0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMiLCJkZWxldGU6b3JnYW5pemF0aW9uX2ZlYXR1cmVfZmxhZ3MiLCJkZWxldGU6b3JnYW5pemF0aW9uX2hhbmRsZXMiLCJkZWxldGU6b3JnYW5pemF0aW9ucyIsImRlbGV0ZTpvcmdhbml6YXRpb25fdXNlcl9hcGlfc2NvcGVzIiwiZGVsZXRlOm9yZ2FuaXphdGlvbl91c2VyX21mYSIsImRlbGV0ZTpvcmdhbml6YXRpb25fdXNlcl9wZXJtaXNzaW9ucyIsImRlbGV0ZTpvcmdhbml6YXRpb25fdXNlcl9yb2xlcyIsImRlbGV0ZTpvcmdhbml6YXRpb25fdXNlcnMiLCJkZWxldGU6cGVybWlzc2lvbnMiLCJkZWxldGU6cHJvcGVydGllcyIsImRlbGV0ZTpyb2xlX3Blcm1pc3Npb25zIiwiZGVsZXRlOnJvbGVzIiwiZGVsZXRlOnVzZXJfbWZhIiwiZGVsZXRlOnVzZXJzIiwiZGVsZXRlOnVzZXJfc2Vzc2lvbnMiLCJkZWxldGU6d2ViaG9va3MiLCJyZWFkOmFwaV9hcHBsaWNhdGlvbl9zY29wZXMiLCJyZWFkOmFwaXMiLCJyZWFkOmFwaV9zY29wZXMiLCJyZWFkOmFwcGxpY2F0aW9uX2Nvbm5lY3Rpb25zIiwicmVhZDphcHBsaWNhdGlvbl9sb2dvdXRfdXJpcyIsInJlYWQ6YXBwbGljYXRpb25fcHJvcGVydGllcyIsInJlYWQ6YXBwbGljYXRpb25zIiwicmVhZDphcHBsaWNhdGlvbnNfcmVkaXJlY3RfdXJpcyIsInJlYWQ6YmlsbGluZ19hZ3JlZW1lbnRzIiwicmVhZDpiaWxsaW5nX2N5Y2xlcyIsInJlYWQ6YmlsbGluZ19lbnRpdGxlbWVudHMiLCJyZWFkOmJpbGxpbmdfcGF5bWVudF9tZXRob2RzIiwicmVhZDpidXNpbmVzc2VzIiwicmVhZDpjb25uZWN0ZWRfYXBwcyIsInJlYWQ6Y29ubmVjdGlvbnMiLCJyZWFkOmVudmlyb25tZW50X2ZlYXR1cmVfZmxhZ3MiLCJyZWFkOmVudmlyb25tZW50cyIsInJlYWQ6ZW52aXJvbm1lbnRfdmFyaWFibGVzIiwicmVhZDpldmVudHMiLCJyZWFkOmV2ZW50X3R5cGVzIiwicmVhZDppZGVudGl0aWVzIiwicmVhZDppbmR1c3RyaWVzIiwicmVhZDpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMiLCJyZWFkOm9yZ2FuaXphdGlvbl9mZWF0dXJlX2ZsYWdzIiwicmVhZDpvcmdhbml6YXRpb25fcHJvcGVydGllcyIsInJlYWQ6b3JnYW5pemF0aW9ucyIsInJlYWQ6b3JnYW5pemF0aW9uX3VzZXJfYXBpX3Njb3BlcyIsInJlYWQ6b3JnYW5pemF0aW9uX3VzZXJfbWZhIiwicmVhZDpvcmdhbml6YXRpb25fdXNlcl9wZXJtaXNzaW9ucyIsInJlYWQ6b3JnYW5pemF0aW9uX3VzZXJfcm9sZXMiLCJyZWFkOm9yZ2FuaXphdGlvbl91c2VycyIsInJlYWQ6cHJvcGVydGllcyIsInJlYWQ6cHJvcGVydHlfY2F0ZWdvcmllcyIsInJlYWQ6cm9sZV9wZXJtaXNzaW9ucyIsInJlYWQ6cm9sZXMiLCJyZWFkOnN1YnNjcmliZXJzIiwicmVhZDp0aW1lem9uZXMiLCJyZWFkOnVzZXJfZmVhdHVyZV9mbGFncyIsInJlYWQ6dXNlcl9pZGVudGl0aWVzIiwicmVhZDp1c2VyX21mYSIsInJlYWQ6dXNlcl9wcm9wZXJ0aWVzIiwicmVhZDp1c2VycyIsInJlYWQ6dXNlcl9zZXNzaW9ucyIsInJlYWQ6d2ViaG9va3MiLCJ1cGRhdGU6YXBpcyIsInVwZGF0ZTphcGlfc2NvcGVzIiwidXBkYXRlOmFwcGxpY2F0aW9uX2xvZ291dF91cmlzIiwidXBkYXRlOmFwcGxpY2F0aW9uX3Byb3BlcnRpZXMiLCJ1cGRhdGU6YXBwbGljYXRpb25fcmVkaXJlY3RfdXJpcyIsInVwZGF0ZTphcHBsaWNhdGlvbnMiLCJ1cGRhdGU6YXBwbGljYXRpb25fdG9rZW5zIiwidXBkYXRlOmJpbGxpbmdfYWdyZWVtZW50cyIsInVwZGF0ZTpiaWxsaW5nX3BheW1lbnRfbWV0aG9kcyIsInVwZGF0ZTpidXNpbmVzc2VzIiwidXBkYXRlOmNvbm5lY3Rpb25zIiwidXBkYXRlOmVudmlyb25tZW50X2ZlYXR1cmVfZmxhZ3MiLCJ1cGRhdGU6ZW52aXJvbm1lbnRzIiwidXBkYXRlOmVudmlyb25tZW50X3ZhcmlhYmxlcyIsInVwZGF0ZTpmZWF0dXJlX2ZsYWdzIiwidXBkYXRlOmlkZW50aXRpZXMiLCJ1cGRhdGU6bWZhIiwidXBkYXRlOm9yZ2FuaXphdGlvbl9mZWF0dXJlX2ZsYWdzIiwidXBkYXRlOm9yZ2FuaXphdGlvbl9tZmEiLCJ1cGRhdGU6b3JnYW5pemF0aW9uX3Byb3BlcnRpZXMiLCJ1cGRhdGU6b3JnYW5pemF0aW9ucyIsInVwZGF0ZTpvcmdhbml6YXRpb25fdXNlcnMiLCJ1cGRhdGU6cGVybWlzc2lvbnMiLCJ1cGRhdGU6cHJvcGVydGllcyIsInVwZGF0ZTpwcm9wZXJ0eV9jYXRlZ29yaWVzIiwidXBkYXRlOnJvbGVfcGVybWlzc2lvbnMiLCJ1cGRhdGU6cm9sZXMiLCJ1cGRhdGU6dXNlcl9mZWF0dXJlX2ZsYWdzIiwidXBkYXRlOnVzZXJfcGFzc3dvcmRzIiwidXBkYXRlOnVzZXJfcHJvcGVydGllcyIsInVwZGF0ZTp1c2VyX3JlZnJlc2hfY2xhaW1zIiwidXBkYXRlOnVzZXJzIiwidXBkYXRlOndlYmhvb2tzIl0sInNjcCI6W10sInYiOiIyIn0.OOyyRHXRcD3W4zb8uXaYrNDs_XLg-J3VppivM0d3rvUafDcTk6058wCK7NDABsd7okrZ8_UMyOVq98rC_Xy9VvzyPC1k2seP08xmDsA4JkI3PEA4odQeyvN5eoiwhHSZ9fo8wNT2iyoPzitzbc7Bzzi10jFtS4t9iysGRPsSa9NBs-PpUwY7RelByKcx9_Niu03miAALV7gHON9g1OeQ8pFx8E8Vli2bKY5kAQKxWTBbJ-KUL0kalYTD9zN1Ucz2Oh7i_NmFbhm308nk6Qasl2HvxxReAm144CTtB1bWimfYr1FkMn62agburWy1uDHfHrThIs4Yll6ZKis5aV5t4w", kindeBinding: any) {
  const url = `/api/v1/user?id=${userId}&expand=organizations`;

  try {
    const response = await kindeBinding.fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    console.log("User data with organizations:", JSON.stringify(userData, null, 2));
    return userData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

export default async function handlePostAuthentication(
  event: onUserPostAuthenticationEvent,
  bindings: any
) {
  // Log the entire event object to see what's available
  console.log("=== POST AUTHENTICATION EVENT ===");
  console.log("Full event object:", JSON.stringify(event, null, 2));
  
  // Log specific event properties if they exist
  if (event.user) {
    console.log("User data:", event.user);
    
    // Try to get full user details with organizations if we have a user ID
    if (event.user.id) {
      try {
        console.log("Fetching detailed user data with organizations...");
        await getUserWithOrganizations(event.user.id, "", bindings["kinde.fetch"]); // Token left empty as requested
      } catch (error) {
        console.error("Failed to fetch detailed user data:", error);
      }
    }
  }
  
  if (event.organization) {
    console.log("Organization data:", event.organization);
  }
  
  if (event.auth) {
    console.log("Auth data:", event.auth);
  }

  // Log all available properties on the event
  console.log("Event keys:", Object.keys(event));
  
  // Try to access any other properties that might be on the event
  for (const key in event) {
    if (event.hasOwnProperty(key)) {
      console.log(`${key}:`, (event as any)[key]);
    }
  }
} 