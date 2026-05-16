import "dotenv/config";
import {test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import * as userModel from "../models/userModelMongoDb.js";
import * as sessionController from "../controllers/sessionController.js";


const TEST_DB = "CorkboardTestDb";
const TEST_COLLECTION = "UsersTest";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;


const validUser = {
    username: "testing123",
    password: "password123",
    email: "email@testing.com",
    birthday: new Date("2000-01-01")
};

const otherUser = {
    username: "imanotherguy",
    password: "password123",
    email: "other@example.com",
    birthday: "2000-01-01",
};
  
async function LoginAndGetCookie(username:string, password, string): Promise<string> {
    const res = await request(app)
    .post("/session/login")
    .send({ username, password });

    const cookie = res.headers["set-cookie"];
    return Array.isArray(cookie) ? cookie[0] : cookie;
}

beforeAll(async () => {
    await userModel.initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL);
});
  
afterAll(async () => {
  await userModel.close();
});
  
beforeEach(async () => {
  await userModel.initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL);
});

//POST /users
test("creates a user successfully", async () => {
    const res = await request(app).post("/users").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.username).toBe(validUser.username.toLowerCase());
});

test("fails to create user with invalid input", async () => {
    const res = await request(app).post("/users").send({...validUser, username: "ab" });
    expect(res.status).toBe(400);
})

test("fails to create user with existing username", async () => {
    await request(app).post("/users").send(validUser);
    const res = await request(app).post("/users").send(validUser);
    expect(res.status).toBe(400);
}