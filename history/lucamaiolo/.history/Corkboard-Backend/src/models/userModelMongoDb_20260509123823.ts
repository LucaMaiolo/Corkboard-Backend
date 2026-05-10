import { MongoError, Db, MongoClient, Collection } from "mongodb";
import { DatabaseError } from "./DatabaseError.js";
import { InvalidInputError } from "./InvalidInputError.js";
import { isValidUser } from "./validateUtils.js";
import logger from "../logger.js";

let client: MongoClient;
let usersCollection: Collection<User> | undefined;
 
const SALT_ROUNDS = 10;

interface User {
    username: string;
    password: string; //hashed
    email: string;
    birthday: Date;
    isAdmin: boolean;
}