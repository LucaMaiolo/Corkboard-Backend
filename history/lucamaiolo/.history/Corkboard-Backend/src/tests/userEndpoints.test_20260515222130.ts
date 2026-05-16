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
  
  