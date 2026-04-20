export function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is not configured (min 16 chars)");
  }
  return s;
}
