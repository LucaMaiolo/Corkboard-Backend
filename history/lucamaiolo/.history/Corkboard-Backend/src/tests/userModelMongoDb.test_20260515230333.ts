import "dotenv/config";
import {test, expect, beforeAll, afterAll, beforeEach } from "vitest";import { initialize, addUser, getSingleUser, getAllUsers, updateUser, deleteUser, checkCredentials, close } from "../models/userModelMongoDb.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { DatabaseError } from "../models/DatabaseError.js";

const TEST_DB = "CorkboardTestDb";
const TEST_COLLECTION = "UsersEndpointTest";
const TEST_URL = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;


const validUser = {
    username: "testing123",
    password: "password123",
    email: "email@testing.com",
    birthday: new Date("2000-01-01")
};


beforeAll(async () => {
    await initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL);
});

afterAll(async () => {
    await close();
})

beforeEach(async () => {
    await initialize(TEST_DB, true, TEST_COLLECTION, TEST_URL);
});

//adding user

test("addUser should add a user to the database", async () => {
    const result = await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    expect(result.username).toBe(validUser.username);
});

test("addUser should throw InvalidInputError for invalid input", async () => {
    await expect(addUser("ab", validUser.password, validUser.email, validUser.birthday)).rejects.toThrow(InvalidInputError);
    await expect(addUser(validUser.username, "short", validUser.email, validUser.birthday)).rejects.toThrow(InvalidInputError);
    await expect(addUser(validUser.username, validUser.password, "not-an-email", validUser.birthday)).rejects.toThrow(InvalidInputError);
    await expect(addUser(validUser.username, validUser.password, validUser.email, new Date("3000-01-01"))).rejects.toThrow(InvalidInputError);
});


//get single user

test("getSingleUser should get a user from the database by username", async() => {
    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    const result = await getSingleUser(validUser.username);
    expect(result).not.toBeNull();
    expect(result.username).toBe(validUser.username.toLowerCase());
});

test("getSingleUser should return null for non-existent user", async() => {
    const result = await getSingleUser("nonexistentuser");
    expect(result).toBeNull();
});


//get all users

test("getAllUsers should return an array of all users", async() => {
    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    const result = await getAllUsers();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].username).toBe(validUser.username.toLowerCase());

});


//update user

test("updateUser should update a user's information", async() => {
    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    const updated = await updateUser(validUser.username, {email: "talib@test.com"});
    expect(updated.email).toBe("talib@test.com");
});

test("updateUser should throw InvalidInputError for invalid input", async() => {
    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    await expect(updateUser(validUser.username, {email: "not-an-email"})).rejects.toThrow(InvalidInputError);
});

//delete user

test("deleteUser should delete a user from the database", async() => {

    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    await deleteUser(validUser.username);
    const result = await getSingleUser(validUser.username);
    expect(result).toBeNull();
});

test("deleteUser should throw DatabaseError for non-existent user", async() => {
    await expect(deleteUser("nonexistentuser")).rejects.toThrow(DatabaseError);
});

//check credentials

test("checkCredentials should return true for valid credentials", async() => {
    await addUser(validUser.username, validUser.password, validUser.email, validUser.birthday);
    const result = await checkCredentials(validUser.username, validUser.password);
    expect(result).toBe(true);
});
