import { type Db, type Collection, MongoError, MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { DatabaseError } from "./DatabaseError.js";
import { InvalidInputError } from "./InvalidInputError.js";
import logger from "../logger.js";

let client: MongoClient | undefined;
let offersCollection: Collection<Offer> | undefined;

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

const handleError = (error: Error, context: string): never => {
  if (error instanceof InvalidInputError) {
    logger.warn(`invalid input in ${context}: ${error.message}`);
    throw error;
  } else if (error instanceof MongoError) {
    logger.error(`mongodb error in ${context}: ${error.message}`);
    throw new DatabaseError("Database operation failed");
  } else if (error instanceof DatabaseError) {
    logger.error(`database error in ${context}: ${error.message}`);
    throw error;
  } else if (error instanceof Error) {
    logger.error(`unexpected error in ${context}: ${error.message}`);
    throw new DatabaseError("An unexpected error occurred");
  } else {
    logger.error(`unknown error in ${context}`);
    throw new DatabaseError(`An unknown error occurred in ${context}`);
  }
};

/**
 * connects to the given mongodb database and initializes the offers collection.
 *
 * @param dbName - name of the database
 * @param resetFlag - if true, drops and recreates the collection
 * @param collection - name of the collection
 * @param url - optional connection url (falls back to env vars)
 * @throws {DatabaseError} if connection fails
 */
export const initialize = async (dbName: string, resetFlag: boolean, collection: string, url?: string): Promise<void> => {
  try {
    const mongoUrl = url ?? `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;
    client = new MongoClient(mongoUrl);
    await client.connect();

    const db: Db = client.db(dbName);

    if (resetFlag && (await db.listCollections({ name: collection }).toArray()).length > 0)
      await db.collection(collection).drop();

    offersCollection = db.collection<Offer>(collection);
    // index for fast lookups by gigId and submittedById
    await Promise.all([
      offersCollection.createIndex({ gigId: 1 }),
      offersCollection.createIndex({ submittedById: 1 }),
      offersCollection.createIndex({ gigId: 1, submittedById: 1 }, { unique: true }),
      offersCollection.createIndex({ id: 1 }, { unique: true })
    ]);

    logger.info(`Connected to MongoDB: ${dbName}/${collection}`);
  } catch (error) {
    if (error instanceof Error) handleError(error, "initialize");
  }
};

const validateOffer = (input: OfferCreateInput): void => {
  if (input.price <= 0) throw new InvalidInputError("price must be greater than 0");
};

/**
 * creates an offer. if the user already has a pending offer on this gig, the old one is replaced.
 *
 * @param input - the offer data
 * @returns the created offer document
 * @throws {InvalidInputError} if any required field is missing or invalid
 * @throws {DatabaseError} if a database error occurs
 */
export const addOffer = async (input: OfferCreateInput): Promise<Offer> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    validateOffer(input);

    const offer: Offer = {
      ...input,
      id: uuidv4(),
      status: OfferStatus.Pending,
      createdAt: new Date(),
    };
    // single operation to replace prior offer from this user on this gig, or inserts if none exists
    await offersCollection.replaceOne(
      { gigId: input.gigId, submittedById: input.submittedById },
      offer,
      { upsert: true },
    );
    return offer;
  } catch (error) {
    if (error instanceof Error) handleError(error, "addOffer");
  }
};

/**
 * retrieves a single offer by its custom id.
 *
 * @param id - the custom uuid of the offer
 * @returns the offer document
 * @throws {DatabaseError} if not found or db error
 */
export const getOfferById = async (id: string): Promise<Offer> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    const offer = await offersCollection.findOne<Offer>({ id });
    if (!offer) throw new DatabaseError("Offer not found");
    return offer;
  } catch (error) {
    if (error instanceof Error) handleError(error, "getOfferById");
  }
};

/**
 * retrieves all offers for a given gig.
 *
 * @param gigId - the custom uuid of the gig
 * @returns array of offer documents
 * @throws {DatabaseError} if a db error occurs
 */
export const getOffersByGig = async (gigId: string): Promise<Offer[]> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    return await offersCollection.find<Offer>({ gigId }).toArray();
  } catch (error) {
    if (error instanceof Error) handleError(error, "getOffersByGig");
  }
};

/**
 * retrieves all offers submitted by a given user.
 *
 * @param submittedById - the custom uuid of the user
 * @returns array of offer documents
 * @throws {DatabaseError} if a db error occurs
 */
export const getOffersByUser = async (submittedById: string): Promise<Offer[]> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    return await offersCollection.find<Offer>({ submittedById }).toArray();
  } catch (error) {
    if (error instanceof Error) handleError(error, "getOffersByUser");
  }
};

/**
 * accepts the given offer and declines all other pending offers on the same gig.
 * returns the gigId so the caller can update the gig's status.
 *
 * @param id - the custom uuid of the offer to accept
 * @returns the gigId of the accepted offer
 * @throws {DatabaseError} if the offer is not found, not pending, or a db error occurs
 */
export const acceptOffer = async (id: string): Promise<{ gigId: string }> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    const accepted = await offersCollection.findOneAndUpdate(
      { id, status: OfferStatus.Pending },
      { $set: { status: OfferStatus.Accepted } },
      { returnDocument: "after" },
    );
    if (accepted === null) throw new DatabaseError("Offer not found or not pending");

    // decline all other pending offers on the same gig
    await offersCollection.updateMany(
      { gigId: accepted.gigId, id: { $ne: id }, status: OfferStatus.Pending },
      { $set: { status: OfferStatus.Declined } },
    );

    return { gigId: accepted.gigId };
  } catch (error) {
    if (error instanceof Error) handleError(error, "acceptOffer");
  }
};

/**
 * declines a single pending offer.
 *
 * @param id - the custom uuid of the offer to decline
 * @throws {DatabaseError} if the offer is not found, not pending, or a db error occurs
 */
export const declineOffer = async (id: string): Promise<void> => {
  if (offersCollection === undefined) throw new DatabaseError("Collection not initialized");
  try {
    const result = await offersCollection.findOneAndUpdate(
      { id, status: OfferStatus.Pending },
      { $set: { status: OfferStatus.Declined } },
    );
    if (!result) throw new DatabaseError("Offer not found or not pending");
  } catch (error) {
    if (error instanceof Error) handleError(error, "declineOffer");
  }
};

/**
 * closes the mongodb connection.
 */
export const close = async (): Promise<void> => {
  if (client)
  await client.close();
};
