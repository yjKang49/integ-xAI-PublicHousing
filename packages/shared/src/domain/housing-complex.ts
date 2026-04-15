// packages/shared/src/domain/housing-complex.ts
export { HousingComplex } from '../types/entities';

export interface CreateHousingComplexInput {
  name: string;
  address: string;
  totalUnits: number;
  totalBuildings: number;
  builtYear: number;
  managedBy: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  floorPlanUrl?: string;
  siteModelUrl?: string;
}
