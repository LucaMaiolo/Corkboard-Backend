import "dotenv/config";
import {test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import * as userModel from "../models/userModelMongoDb.js";
import * as sessionController from "../controllers/sessionController.js";


const TEST_DB = "CorkboardTestDb";
const TEST_COLLECTION = "UsersModelTest";
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
  
async function LoginAndGetCookie(username:string, password: string): Promise<string> {
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
});


//GET /users
test("fails when not logged in or admin", async () => {
    const res = await request(app).get("/users");    
    expect(res.status).toBe(401);
});

//GET /users/:username
test("returns user data when logged in", async () => {
    await request(app).post("/users").send(validUser);
    const cookie = await LoginAndGetCookie(validUser.username, validUser.password);
    const res = await request(app).get(`/users/${validUser.username}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
});

test("returns 404 if user not found", async () => {
    await request(app).post("/users").send(validUser);

    const cookie = await LoginAndGetCookie(validUser.username, validUser.password);
    const res = await request(app).get("/users/nonexistentuser").set("Cookie", cookie);
    expect(res.status).toBe(404);
});
test("returns 401 if not logged in", async () => {
    const res = await request(app).get(`/users/${validUser.username}`);
    expect(res.status).toBe(401);
});


//PUT /users/:username

test("returns 401 if not logged in", async () => {
    const res = await request(app).put(`/users/${validUser.username}`).send({currentPassword: validUser.password, newPassword: "newpassword123"});
    expect(res.status).toBe(401);
});

test("returns 403 if user tries to update another user", async() => {
    await request(app).post("/users").send(validUser);
    await request(app).post("/users").send(otherUser);

    const cookie = await LoginAndGetCookie(validUser.username, validUser.password);
    const res = await request(app)
    .put(`/users/${otherUser.username}`)
    .set("Cookie", cookie)
    .send({currentPassword: validUser.password, newPassword: "newpassword123"});
    expect(res.status).toBe(403);
});

test("returns 401 if current password is incorrect", async () => {
    await request(app).post("/users").send(validUser);
    const cookie = await LoginAndGetCookie(validUser.username, validUser.password);
    const res = await request(app)
    .put(`/users/${validUser.username}`)
    .set("Cookie", cookie)
    .send({currentPassword: "wrongpassword", newPassword: "newpassword123"});
    expect(res.status).toBe(401);
});

