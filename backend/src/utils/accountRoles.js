const MODES = ['customer', 'driver', 'restaurant'];
function rolesOf(user) {
  if (user.role === 'admin') return ['admin'];
  return [...new Set(['customer', user.role, ...(user.roles || [])])].filter(role => MODES.includes(role));
}
function hasRole(user, role) { return Boolean(user) && rolesOf(user).includes(role); }
function sessionUser(user, activeRole) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: activeRole, accountRole: user.role, roles: rolesOf(user) };
}
module.exports = { MODES, rolesOf, hasRole, sessionUser };
