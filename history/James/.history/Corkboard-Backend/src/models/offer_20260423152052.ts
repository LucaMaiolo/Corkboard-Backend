export type OfferStatus = "pending" | "accepted" | "declined";

export interface Offer {
	_id: string;
	gig: string;
	submittedBy: string;
	price: number;
	message?: string;
	status: OfferStatus;
	createdAt: Date;
}
