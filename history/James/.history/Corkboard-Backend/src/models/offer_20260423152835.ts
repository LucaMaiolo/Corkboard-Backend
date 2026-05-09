export interface Offer {
	id: string;
	gig: string;
	price: number;
	message?: string;
	status: OfferStatus;
	createdAt: Date;
}
