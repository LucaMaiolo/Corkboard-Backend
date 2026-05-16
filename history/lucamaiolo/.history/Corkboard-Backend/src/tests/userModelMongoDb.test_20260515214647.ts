import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initialize, addUser, getSingleUser, getAllUsers, updateUser, deleteUser, checkCredentials, close } from "../models/userModelMongoDb.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { DatabaseError } from "../models/DatabaseError.js";

const TESTDB = "CorkboardTestDb";
const TESTCOLLECTION = "UsersTest";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;


const validUser = {

    username: "testing123",
    password: "password123",
    email: "email@testing.com",
    birthday: new Date("2000-01-01")
}
