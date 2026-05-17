import "dotenv/config";
import { test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import * as userModel from "../models/userModelMongoDb.js";
import * as taskModel from "../models/taskModelMongoDb.js";
import * as offerModel from "../models/offerModelMongoDb.js";

const TEST_DB = "CorkboardTestDb";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;

const lister  = { username: "testlister",   password: "password123", email: "lister@offertest.com",   birthday: "2000-01-01" };
const offerer = { username: "testofferer",  password: "password123", email: "offerer@offertest.com",  birthday: "2000-01-01" };
const stranger = { username: "teststranger", password: "password123", email: "stranger@offertest.com", birthday: "2000-01-01" };
