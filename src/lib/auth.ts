/**
 * Basic RBAC layer (FR7.5) — lightweight role-based access control.
 * For POC: roles are header-based. Production: integrate with Azure AD / Cesar's platform.
 */

export type UserRole = "admin" | "analyst" | "viewer" | "executive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgUnit?: string; // Scoping to specific org unit
}

// Role hierarchy: admin > analyst > executive > viewer
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  analyst: 3,
  executive: 2,
  viewer: 1,
};

// Permission matrix: which roles can access which features
const PERMISSIONS: Record<string, UserRole[]> = {
  "dashboard:view": ["admin", "analyst", "executive", "viewer"],
  "query:execute": ["admin", "analyst", "executive"],
  "reports:generate": ["admin", "analyst", "executive"],
  "reports:custom": ["admin", "analyst"],
  "jobs:submit": ["admin", "analyst", "executive"],
  "jobs:manage": ["admin", "analyst"],
  "ci:view": ["admin", "analyst", "executive", "viewer"],
  "explorer:query": ["admin", "analyst"],
  "admin:view": ["admin"],
  "admin:configure": ["admin"],
  "export:xlsx": ["admin", "analyst", "executive"],
  "export:pdf": ["admin", "analyst", "executive"],
  "voice:use": ["admin", "analyst", "executive"],
};

/**
 * Extract user from request headers.
 * POC: uses X-User-Role header. Production: JWT/Azure AD token.
 */
export function getUserFromRequest(headers: Headers): User {
  const role = (headers.get("x-user-role") || "analyst") as UserRole;
  const name = headers.get("x-user-name") || "current.user";
  const email = headers.get("x-user-email") || "current.user@mars.com";
  const orgUnit = headers.get("x-user-org") || undefined;

  return {
    id: email,
    name,
    email,
    role: ROLE_HIERARCHY[role] ? role : "viewer",
    orgUnit,
  };
}

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(user: User, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Check if user's role meets minimum level.
 */
export function hasMinRole(user: User, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get all permissions for a role.
 */
export function getRolePermissions(role: UserRole): string[] {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
}

/**
 * Available roles for admin UI.
 */
export const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrator", description: "Full access to all features including configuration" },
  { value: "analyst", label: "Analyst", description: "Query, reports, exports, data explorer, job management" },
  { value: "executive", label: "Executive", description: "View dashboards, reports, CI. Submit queries and jobs" },
  { value: "viewer", label: "Viewer", description: "View-only access to dashboards and CI" },
];
