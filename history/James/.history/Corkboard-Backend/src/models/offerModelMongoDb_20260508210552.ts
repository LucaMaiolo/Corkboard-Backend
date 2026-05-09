import { type Db, type Collection, MongoClient } from "mongodb";
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

export const initialize = async (dbName: string, resetFlag: boolean, collection: string, url?: string): Promise<void> => {
  try {
    const mongoUrl = url ?? `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;
    client = new MongoClient(mongoUrl);
    await client.connect();

    const db: Db = client.db(dbName);

    if (resetFlag && (await db.listCollections({ name: collection }).toArray()).length > 0)
      await db.collection(collection).drop();

    offersCollection = db.collection<Offer>(collection);
    logger.info(`Connected to MongoDB: ${dbName}/${collection}`);
  } catch (error) {
    if (error instanceof Error) handleError(error, "initialize");
  }
};

export const close = async (): Promise<void> => {
  if (client)
  await client.close();
};