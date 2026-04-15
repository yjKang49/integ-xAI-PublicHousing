// packages/shared/src/domain/zone.ts
export { Zone } from '../types/entities';

export interface CreateZoneInput {
  floorId: string;
  buildingId: string;
  complexId: string;
  name: string;
  code: string;
  description?: string;
}
