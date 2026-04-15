// packages/shared/src/domain/floor.ts
export { Floor } from '../types/entities';

export interface CreateFloorInput {
  buildingId: string;
  complexId: string;
  floorNumber: number;  // negative = underground (e.g. -1 = B1)
  floorName: string;    // display: "B1", "1F", "3F"
  area: number;         // ㎡
  planImageUrl?: string;
}
