// apps/api/src/common/interfaces/current-user.interface.ts
import { UserRole } from '@ax/shared';

/**
 * Shape of req.user after JwtStrategy.validate() runs.
 * Matches the full User document from CouchDB (minus password fields).
 */
export interface CurrentUserDto {
  _id: string;
  _rev?: string;
  docType: 'user';
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  assignedComplexIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
