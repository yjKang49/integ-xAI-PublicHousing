export { Organization } from '../types/entities';
export type OrganizationPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export interface CreateOrganizationInput {
    name: string;
    businessNumber: string;
    address: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    plan: OrganizationPlan;
    contractStartDate: string;
    contractEndDate: string;
    logoUrl?: string;
}
