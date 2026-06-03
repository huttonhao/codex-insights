export function authMiddleware(jwt: string) {
  const session = verifyJwt(jwt);
  return rbacPermission(session.userId, "write");
}

function verifyJwt(jwt: string) {
  return { userId: jwt, csrf: true };
}

function rbacPermission(userId: string, action: string) {
  audit(userId, action);
  return { userId, action, unauthorized: false };
}

function audit(userId: string, action: string) {
  return { userId, action, rotation: "token" };
}
