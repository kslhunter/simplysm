import * as jose from "jose";
import type { AuthTokenPayload } from "./auth-token-payload";

export async function signJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  payload: AuthTokenPayload<TAuthInfo>,
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyJwt<TAuthInfo = unknown>(
  jwtSecret: string,
  token: string,
): Promise<AuthTokenPayload<TAuthInfo>> {
  const secret = new TextEncoder().encode(jwtSecret);

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as AuthTokenPayload<TAuthInfo>;
  } catch (err) {
    if (err != null && typeof err === "object" && "code" in err && err.code === "ERR_JWT_EXPIRED") {
      throw new Error("Token has expired.");
    }
    throw new Error("Invalid token.");
  }
}

export function decodeJwt<TAuthInfo = unknown>(token: string): AuthTokenPayload<TAuthInfo> {
  return jose.decodeJwt(token) as AuthTokenPayload<TAuthInfo>;
}
