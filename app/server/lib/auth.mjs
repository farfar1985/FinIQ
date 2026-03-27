/**
 * FinIQ RBAC Enforcement Middleware — FR7.5
 *
 * Reads the user role from `x-user-role` header (default: "analyst").
 * Provides `requireRole(...roles)` middleware factory for route protection.
 *
 * Roles: admin, analyst, viewer, auditor
 */

const VALID_ROLES = ["admin", "analyst", "viewer", "auditor"];

/**
 * Returns Express middleware that checks if the requesting user's role
 * is in the allowed set. Responds 403 if not.
 *
 * @param {...string} roles - One or more allowed roles
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post("/admin/config", requireRole("admin"), handler);
 *   router.post("/jobs", requireRole("admin", "analyst"), handler);
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = (req.headers["x-user-role"] || "analyst").toLowerCase().trim();

    if (!VALID_ROLES.includes(userRole)) {
      return res.status(403).json({
        error: `Unknown role: "${userRole}". Valid roles: ${VALID_ROLES.join(", ")}`,
      });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${userRole}`,
      });
    }

    // Attach parsed role to request for downstream use
    req.userRole = userRole;
    next();
  };
}

export default { requireRole, VALID_ROLES };
