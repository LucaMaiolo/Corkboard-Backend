import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initialize, addUser, getSingleUser, getAllUsers, updateUser, deleteUser, checkCredentials, close } from "../models/userModelMongoDb.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { DatabaseError } from "../models/DatabaseError.js";

const TEST_DB = "CorkboardTestDb";
const TEST_COLLECTION = "UsersTest";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;


const validUser = {
    username: "testing123",
    password: "password123",
    email: "email@testing.com",
    birthday: new Date("2000-01-01")
}


beforeAll(async () => {
    await initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL);
});

afterAll(async () => {
    await close();
})

beforeEach(async () => {
    await initialize(TEST_DB, true, TESTC_OLLECTION, TEST_URL);
  });