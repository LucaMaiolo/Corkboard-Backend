import "dotenv/config";
import {
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  afterEach,
} from "vitest";
import request from "supertest";
import app from "../app.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as model from "../models/taskModelMongoDb.js";
import { executionAsyncId } from "node:async_hooks";
import { blacklist } from "validator";
import { ObjectId } from "mongodb";

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
    await request(app).post("/users").send(ownerUser);
    await request(app).post("/users").send(otherUser);
  } catch (err: unknown) {
    if (err instanceof Error) console.log(err.message);
    else console.log("Unknown error during beforeEach in unit tests");
  }
});

afterEach(async () => {
  await model.close();
});

// POST /tasks

test("POST /tasks: 201 on a valid task from authenticated user", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  const res = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send(validTask);
  expect(res.status).toBe(201);
  expect(res.body.name).toBe(validTask.name);
});

test("POST /tasks: 401 when not logged in", async () => {
  const res = await request(app).post("/tasks").send(validTask);
  expect(res.status).toBe(401);
});

test("POST /tasks: 400 on invalid task data", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  const res = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send({ ...validTask, name: "" });
  expect(res.status).toBe(400);
});

test("POST /tasks: 500 when database is closed", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  await model.close();
  const res = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send(validTask);
  expect(res.status).toBe(500);
});

// GET /tasks

test("GET /tasks: 200 and returns all tasks", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  await request(app).post("/tasks").set("Cookie", cookie).send(validTask);
  await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send({ ...validTask, name: "MowLawn" });
  const res = await request(app).get("/tasks");
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(2);
});

test("GET /tasks: 200 with empty array when no tasks exists", async () => {
  const res = await request(app).get("/tasks");
  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});

test("GET /tasks: 500 when database is closed", async () => {
  await model.close();
  const res = await request(app).get("/tasks");
  expect(res.status).toBe(500);
});

// GET /tasks/:id

test("GET /tasks/:id: 200 and returns the correct tasks", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  const created = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send(validTask);
  const res = await request(app).get(`/tasks/${created.body._id}`);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe(validTask.name);
});

test("GET /tasks/:id: 400 on a malformed id", async () => {
  const res = await request(app).get("/tasks/not-a-valid-id");
  expect(res.status).toBe(400);
});

test("GET /tasks/:id: 404 when task does not exist", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  const created = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send(validTask);
  const id = created.body._id;
  await request(app).delete(`/tasks/${id}`).set("Cookie", cookie);
  const res = await request(app).get(`/tasks/${id}`);
  expect(res.status).toBe(404);
});

test("GET /tasks/:id: 500 when database is closed", async () => {
  await model.close();
  const fakeId = new ObjectId().toString();
  const res = await request(app).get(`/tasks/${fakeId}`);
  expect(res.status).toBe(500);
});

// PUT /tasks/:id

test("PUT /tasks/:id: 200 when owner updates their task", async () => {
  const cookie = await LoginAndGetCookie(
    ownerUser.username,
    ownerUser.password,
  );
  const created = await request(app)
    .post("/tasks")
    .set("Cookie", cookie)
    .send(validTask);
  const res = await request(app)
    .put(`/tasks/${created.body._id}`)
    .set("Cookie", cookie)
    .send({ ...validTask, pay: 99 });
  expect(res.status).toBe(200);
  expect(res.body.pay).toBe(99);
});
