export enum OfferStatus {
  Pending = "pending",
  Accepted = "accepted",
  Declined = "declined",
}

export interface Offer {
  id: string;
  gigId: string;
  submittedById: string;
  listerId: string;
  price: number;
  message?: string;
  status: OfferStatus;
  createdAt: Date;
}

export type OfferCreateInput = Omit<Offer, "id" | "status" | "createdAt">;
