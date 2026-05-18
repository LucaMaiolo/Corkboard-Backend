import "dotenv/config";
import { test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as model from "../models/taskModelMongoDb.js";

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
