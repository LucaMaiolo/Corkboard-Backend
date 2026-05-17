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
