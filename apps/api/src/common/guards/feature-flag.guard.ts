// apps/api/src/common/guards/feature-flag.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service'
import { FeatureFlagKey } from '@ax/shared'

export const FEATURE_FLAG_KEY = 'requiredFeatureFlag'

/**
 * @RequireFeatureFlag(FeatureFlagKey.PHASE2_AI)
 *
 * 라우트에 붙이면 해당 Feature Flag가 활성화된 경우에만 접근을 허용합니다.
 * 플래그 비활성화 → 403 Forbidden
 */
export const RequireFeatureFlag = (key: FeatureFlagKey | string) =>
  SetMetadata(FEATURE_FLAG_KEY, key)

/**
 * Feature Flag Guard
 *
 * @RequireFeatureFlag() 데코레이터와 함께 사용합니다.
 * 요청 사용자의 orgId를 사용하여 org-scoped 플래그도 지원합니다.
 *
 * 사용 예:
 *   @UseGuards(FeatureFlagGuard)
 *   @RequireFeatureFlag(FeatureFlagKey.PHASE2_AI)
 *   @Post('analyze')
 *   async analyze() { ... }
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFlag = this.reflector.getAllAndOverride<string | undefined>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    )

    // 데코레이터 없으면 통과
    if (!requiredFlag) return true

    const { user } = context.switchToHttp().getRequest()
    const orgId: string | undefined = user?.orgId

    const enabled = await this.featureFlagsService.isEnabled(requiredFlag, orgId)

    if (!enabled) {
      throw new ForbiddenException(
        `Feature '${requiredFlag}' is not enabled for this organization.`,
      )
    }

    return true
  }
}
