import { type Collection, MongoClient } from "mongodb";
import { DatabaseError } from "./DatabaseError.js";
import { InvalidInputError } from "./InvalidInputError.js";
import logger from "../logger.js";


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

let client: MongoClient | undefined;
let offersCollection: Collection<Offer> | undefined;

const handleError = (error: Error, context: string): void => {
  if (error instanceof InvalidInputError) {
    logger.warn(`invalid input in ${context}: ${error.message}`);
    throw error;
  } else if (error instanceof Error) {
    logger.error(`unexpected error in ${context}: ${error.message}`);
    throw new DatabaseError("An unexpected error occurred");
  } else {
    logger.error(`unknown error in ${context}`);
    throw new DatabaseError(`An unknown error occurred in ${context}`);
  }
};

export const close = async (): Promise<void> => {
  if (client)
  await client.close();
};
