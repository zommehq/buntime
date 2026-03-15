export interface TokenPayload {
  hyper_cluster_space?: string;
  hyper_client?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  preferred_username?: string;
  email?: string;
}

export function getTokenPayload(token: string): TokenPayload | null {
  try {
    // Remove "Bearer " se estiver presente
    const cleanToken = token.replace(/^Bearer\s+/i, "");

    // Decodifica o token JWT (apenas o payload, sem verificar assinatura)
    const parts = cleanToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}
