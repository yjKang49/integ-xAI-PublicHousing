// packages/shared/src/domain/building.ts
export { Building } from '../types/entities';

export interface CreateBuildingInput {
  complexId: string;
  name: string;
  code: string;
  totalFloors: number;
  undergroundFloors: number;
  totalUnits: number;
  builtDate: string;
  structureType: string;
  modelUrl?: string;
}
