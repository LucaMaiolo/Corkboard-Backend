import { MongoMemoryServer } from "mongodb-memory-server";
import { ObjectId } from "mongodb";
import * as model from "../models/taskModelMongoDb.js";
import type { Task, Status as TaskStatus } from "../models/taskModelMongoDb.js";
import {
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";

vi.setConfig({ testTimeout: 5_000 });
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  console.log("Mock Database started");
});

afterAll(async () => {
  await mongod.stop();
  console.log("Mock Database stopped");
});
let validTask: Task;
beforeEach(async () => {
  validTask = {
    listerId: "user123",
    name: "FixSink",
    description: "This is a valid task description",
    location: "Montreal",
    pay: 25,
    timeInMins: 60,
    status: "Available" as TaskStatus,
  };
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

//AddTask

test("addTask: inserts a valid task and returns it with an _id", async () => {
  const result = await model.addTask(validTask);
  expect(result._id).toBeInstanceOf(ObjectId);
  expect(result.name).toBe(validTask.name);
});

test("addTask: created task is retrievable via getAllTasks", async () => {
  await model.addTask(validTask);
  const all = await model.getAllTasks();
  expect(all.length).toBe(1);
  expect(all[0].name).toBe(validTask.name);
});

test("addTask: throws InvalidInputError when name is empty", async () => {
  await expect(model.addTask({ ...validTask, name: "" })).rejects.toThrow(
    InvalidInputError,
  );
});

test("addTask: throws InvalidInputError when description is empty", async () => {
  await expect(
    model.addTask({ ...validTask, description: "" }),
  ).rejects.toThrow(InvalidInputError);
});

test("addTask: throws InvalidInputError when pay is zero", async () => {
  await expect(model.addTask({ ...validTask, pay: 0 })).rejects.toThrow(
    InvalidInputError,
  );
});

test("addTest: throws InvalidInputError when pay is negative", async () => {
  await expect(model.addTask({ ...validTask, pay: -5 })).rejects.toThrow(
    InvalidInputError,
  );
});

test("addTask: throws InvalidInputError when TimeInMins is zero", async () => {
  await expect(model.addTask({ ...validTask, timeInMins: 0 })).rejects.toThrow(
    InvalidInputError,
  );
});

test("addTask: throws InvalidInputError when TimeInMins is negative", async () => {
  await expect(model.addTask({ ...validTask, timeInMins: -5 })).rejects.toThrow(
    InvalidInputError,
  );
});

// getAllTasks

test("getAllTasks: returns empty array when collection is empty", async () => {
  const results = await model.getAllTasks();
  expect(results).toEqual([]);
});

test("getAllTasks: returns all inserted tasks", async () => {
  await model.addTask(validTask);
  await model.addTask({ ...validTask, name: "MowLawn" });
  const results = await model.getAllTasks();
  expect(results.length).toBe(2);
});

// getTaskById
