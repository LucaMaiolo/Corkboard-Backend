import "dotenv/config";
import { test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as model from "../models/taskModelMongoDb.js";

vi.setConfig({ testTimeout: 5_000 });
let mongod: MongoMemoryServer;

const ownerUser = {
  username: "taskowner",
  password: "password123",
  email: "owner@test.com",
  birthday: "2000-01-01",
};

const otherUser = {
  username: "otheruser",
  password: "password123",
  email: "other@test.com",
  birthday: "2000-01-01",
};

const validTask = {
  name: "FixSink",
  description: "This is a valid task description",
  location: "Montreal",
  pay: 25,
  timeInMins: 60,
  status: "Available",
};

async function LoginAndGetCookie(
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app)
    .post("/session/login")
    .send({ username, password });

  const cookie = res.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  console.log("Mock Database started");
});

afterAll(async () => {
  await mongod.stop();
  console.log("Mock Database stopped");
});

beforeEach(async () => {
  try {
    const url: string = mongod.getUri();
    await model.initialize("testDb", true, "tasks", url);
    process.env = Object.assign(process.env, { CUSTOM_VAR: "value" });
  } catch (err: unknown) {
    if (err instanceof Error) console.log(err.message);
    else console.log("Unknown error during beforeEach in unit tests");
  }
});

afterEach(async () => {
  await model.close();
});
