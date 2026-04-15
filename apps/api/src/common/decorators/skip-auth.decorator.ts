// apps/api/src/common/decorators/skip-auth.decorator.ts
// Marks a route as accessible without JWT authentication.
// The JwtAuthGuard checks IS_SKIP_AUTH metadata — if true, JWT validation is bypassed.
// Intended for internal worker-to-worker endpoints that use an API-key header instead.
import { SetMetadata } from '@nestjs/common'

export const IS_SKIP_AUTH_KEY = 'isSkipAuth'
export const SkipAuth = () => SetMetadata(IS_SKIP_AUTH_KEY, true)
