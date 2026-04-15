export { Floor } from '../types/entities';
export interface CreateFloorInput {
    buildingId: string;
    complexId: string;
    floorNumber: number;
    floorName: string;
    area: number;
    planImageUrl?: string;
}
