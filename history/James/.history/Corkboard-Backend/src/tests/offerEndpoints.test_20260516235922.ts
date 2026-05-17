import "dotenv/config";
import { test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import * as userModel from "../models/userModelMongoDb.js";
import * as taskModel from "../models/taskModelMongoDb.js";
import * as offerModel from "../models/offerModelMongoDb.js";

const TEST_DB = "CorkboardTestDb";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;

const lister = { username: "testlister", password: "password123", email: "lister@offertest.com", birthday: "2000-01-01" };
const offerer = { username: "testofferer", password: "password123", email: "offerer@offertest.com", birthday: "2000-01-01" };
const stranger = { username: "teststranger", password: "password123", email: "stranger@offertest.com", birthday: "2000-01-01" };

/**
 * logs in via the session endpoint and returns the full set-cookie header value.
 * @param username - account username
 * @param password - account password
 */
const loginAndGetCookie = async (username: string, password: string): Promise<string> => {
    const response = await request(app).post("/session/login").send({ username, password });
    const cookie = response.headers["set-cookie"] as string | string[];
    return Array.isArray(cookie) ? cookie[0]! : cookie;
};

/**
 * creates a task via the api and returns its mongodb _id string.
 * @param cookie - lister's session cookie
 * @param pay - maximum payout for the gig
 */
const createTask = async (cookie: string, pay = 100): Promise<string> => {
    const response = await request(app)
        .post("/tasks")
        .set("Cookie", cookie)
        .send({ name: "Test Gig", description: "test description", location: "Montreal", pay, timeInMins: 60, status: "Available" });
    return (response.body as { _id: string })._id;
};

/**
 * creates an offer via the api and returns the supertest response.
 * @param gigId - mongodb _id of the task to bid on
 * @param submittedById - username of the offerer
 * @param listerId - username of the task owner
 * @param price - offered price
 */
const createOffer = async (gigId: string, submittedById: string, listerId: string, price: number) =>
    request(app).post("/offers").send({ gigId, submittedById, listerId, price });

beforeAll(async () => {
    await userModel.initialize(TEST_DB, true, "OffersEndpointUsers", TEST_URL);
    await taskModel.initialize(TEST_DB, true, "OffersEndpointTasks", TEST_URL);
    await offerModel.initialize(TEST_DB, true, "OffersEndpointOffers", TEST_URL);
});

afterAll(async () => {
    await userModel.close();
    await taskModel.close();
    await offerModel.close();
});

beforeEach(async () => {
    await userModel.initialize(TEST_DB, true, "OffersEndpointUsers", TEST_URL);
    await taskModel.initialize(TEST_DB, true, "OffersEndpointTasks", TEST_URL);
    await offerModel.initialize(TEST_DB, true, "OffersEndpointOffers", TEST_URL);
});
