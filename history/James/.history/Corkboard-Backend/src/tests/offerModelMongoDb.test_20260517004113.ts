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
