import { UserRole } from '../types/enums';
/**
 * Authenticated user shape returned by GET /auth/me and embedded in JWT payload.
 * Safe to use on both frontend and backend — no password fields.
 */
export interface AuthUser {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string | null;
    assignedComplexIds: string[];
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
}
/** Minimal token payload decoded from JWT — matches jwtService.signAsync payload */
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    orgId: string | null;
    jti: string;
    iat?: number;
    exp?: number;
}
/** Shape of /auth/login and /auth/refresh responses (inside ApiResponse.data) */
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface LoginResponse extends AuthTokens {
    user: AuthUser;
}
