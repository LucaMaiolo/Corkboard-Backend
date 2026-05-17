import "dotenv/config";
import { test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initialize, addOffer, getOffersByGig, getOffersByUser, acceptOffer, declineOffer, close } from "../models/offerModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";

const TEST_DB = "CorkboardTestDb";
const TEST_COLLECTION = "OfferModelTest";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;

const validOffer = {
    gigId: "000000000000000000000001",
    submittedById: "offerer1",
    listerId: "lister1",
    price: 50,
};

beforeAll(async () => await initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL));
afterAll(async () => await close());
beforeEach(async () => await initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL));

// addOffer

test("addOffer should insert an offer and return it with pending status", async () => {
    const result = await addOffer(validOffer);
    expect(result.status).toBe("pending");
    expect(result.id).toBeDefined();
    expect(result.price).toBe(validOffer.price);
});

test("addOffer should throw InvalidInputError for price of zero", async () => {
    await expect(addOffer({ ...validOffer, price: 0 })).rejects.toThrow(InvalidInputError);
});

test("addOffer should replace an existing offer from the same user on the same gig", async () => {
    await addOffer(validOffer);
    await addOffer({ ...validOffer, price: 75 });
    const offers = await getOffersByGig(validOffer.gigId);
    expect(offers.length).toBe(1);
    expect(offers[0]!.price).toBe(75);
});

// getOffersByGig

test("getOffersByGig should return all offers for a given gig", async () => {
    await addOffer(validOffer);
    await addOffer({ ...validOffer, submittedById: "offerer2" });
    const result = await getOffersByGig(validOffer.gigId);
    expect(result.length).toBe(2);
});

test("getOffersByGig should return an empty array when no offers exist", async () => {
    const result = await getOffersByGig("000000000000000000000099");
    expect(result).toEqual([]);
});

// getOffersByUser

test("getOffersByUser should return all offers submitted by a given user", async () => {
    await addOffer(validOffer);
    await addOffer({ ...validOffer, gigId: "000000000000000000000002" });
    const result = await getOffersByUser(validOffer.submittedById);
    expect(result.length).toBe(2);
});

test("getOffersByUser should return an empty array when the user has no offers", async () => {
    const result = await getOffersByUser("nobody");
    expect(result).toEqual([]);
});

// acceptOffer

test("acceptOffer should set the offer status to accepted", async () => {
    const offer = await addOffer(validOffer);
    await acceptOffer(offer.id);
    const offers = await getOffersByGig(validOffer.gigId);
    expect(offers[0]!.status).toBe("accepted");
});

test("acceptOffer should decline all other pending offers on the same gig", async () => {
    const accepted = await addOffer(validOffer);
    await addOffer({ ...validOffer, submittedById: "offerer2" });
    await acceptOffer(accepted.id);
    const offers = await getOffersByGig(validOffer.gigId);
    const declined = offers.filter((offer) => offer.submittedById === "offerer2");
    expect(declined[0]!.status).toBe("declined");
});

test("acceptOffer should throw DatabaseError for a non-existent offer id", async () => {
    await expect(acceptOffer("00000000-0000-0000-0000-000000000000")).rejects.toThrow(DatabaseError);
});