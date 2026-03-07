import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TaxRate {
    id: NatId;
    gstRatePercent: bigint;
    isExempt: boolean;
    isRcmApplicable: boolean;
    name: string;
    description: string;
    cessPercent: bigint;
}
export type NatId = bigint;
export interface Item {
    id: NatId;
    purchasePrice: bigint;
    name: string;
    unit: bigint;
    sellingPrice: bigint;
    description: string;
    cessPercent: bigint;
    isActive: boolean;
    itemType: ItemType;
    gstRate: bigint;
    hsnSacCode: string;
    openingStock: bigint;
}
export interface Party {
    id: NatId;
    pan: string;
    stateCode: bigint;
    billingAddress: string;
    name: string;
    isActive: boolean;
    email: string;
    gstin: string;
    shippingAddress: string;
    partyType: PartyType;
    phone: string;
}
export interface BusinessProfile {
    stateCode: bigint;
    businessName: string;
    gstin: string;
    address: string;
    registrationType: RegistrationType;
    contactDetails: string;
}
export interface UserProfile {
    name: string;
    role: string;
    email: string;
}
export enum ItemType {
    service = "service",
    goods = "goods"
}
export enum PartyType {
    customer = "customer",
    both = "both",
    vendor = "vendor"
}
export enum RegistrationType {
    unregistered = "unregistered",
    regular = "regular",
    composition = "composition"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addItem(item: Item): Promise<NatId>;
    addParty(party: Party): Promise<NatId>;
    addTaxRate(taxRate: TaxRate): Promise<NatId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteItem(id: NatId): Promise<void>;
    deleteParty(id: NatId): Promise<void>;
    deleteTaxRate(id: NatId): Promise<void>;
    getAllItems(): Promise<Array<Item>>;
    getAllParties(): Promise<Array<Party>>;
    getAllTaxRates(): Promise<Array<TaxRate>>;
    getBusinessProfile(): Promise<BusinessProfile | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getItem(id: NatId): Promise<Item | null>;
    getParty(id: NatId): Promise<Party | null>;
    getTaxRate(id: NatId): Promise<TaxRate | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setBusinessProfile(profile: BusinessProfile): Promise<void>;
    updateItem(id: NatId, updatedItem: Item): Promise<void>;
    updateParty(id: NatId, updatedParty: Party): Promise<void>;
    updateTaxRate(id: NatId, updatedTaxRate: TaxRate): Promise<void>;
}
