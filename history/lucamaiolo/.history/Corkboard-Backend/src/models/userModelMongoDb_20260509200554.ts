import { MongoError, Db, MongoClient, Collection } from "mongodb";
import { DatabaseError } from "./DatabaseError.js";
import { InvalidInputError } from "./InvalidInputError.js";
import { isValidUser as isValid } from "./validateUtils.js";
import bcrypt from "bcrypt";
import logger from "../logger.js";
import validator from "validator";
import { validate } from "uuid";

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

async function initialize(
    dbName: string,
    resetFlag: boolean,
    collection: string,
    url?: string, // optional paramater
): Promise<void> {
    try {
        let mongoUrl: string;
        if (url !== undefined && url !== null) {
            mongoUrl = url;
        } else {
            mongoUrl = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;
        }
        client = new MongoClient(mongoUrl); // store connected client for use while the app is running
        await client.connect();

        const db: Db = client.db(dbName);

        if (resetFlag) {
            const collections = await db
                .listCollections({ name: collection })
                .toArray();
            if (collections.length > 0) {
                await db.collection(collection).drop();
            }
        }
        usersCollection = db.collection<User>(collection);

        logger.info("Connected to MongoDB:" + dbName);
    } catch (err: unknown) {
        if (err instanceof MongoError) {
            logger.error("MongoDB error: " + err.message);
            throw new DatabaseError("Database operation failed");
        } else if (err instanceof DatabaseError) {
            logger.error("Database error: " + err.message);
            throw err;
        } else {
            logger.error("Unexpected error: " + String(err));
            throw new Error("Unexpected error during database initialization");
        }
    }
}

 async function AddUser(
    username: string,
    password: string,
    email: string,
    birthday: Date
): Promise<User> {
    if (!usersCollection) {
        throw new DatabaseError("Database not initialized");
    }
    try {
        isValid(username, password, email, birthday);
        
        const existing = await usersCollection.findOne({username})
        if (existing){
            throw new InvalidInputError("Username already exists");
        }
        const existingEmail = await usersCollection.findOne({email})
        if (existingEmail){
            throw new InvalidInputError("Email already in use");
        }   

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser: User = {
            username,
            password: hashedPassword,
            email,
            birthday,
            isAdmin: false
        }

        await usersCollection.insertOne(newUser);
        logger.info("User added: " + username);
        return newUser;
    }catch (err: unknown){
        if (err instanceof InvalidInputError){
            logger.warn("Invalid input: " + err.message);
            throw err; 
        }
        else if (err instanceof MongoError){
            logger.error("MongoDB error: " + err.message);
            throw new DatabaseError("Database operation failed");
        }
        else if(err instanceof DatabaseError) {
            logger.error("Database error: " + err.message);
            throw err;
        } 
        else if (err instanceof Error) {
            logger.error("Unexpected error: " + err.message);
            throw new DatabaseError("An unexpected error occurred");
        } 
          
        else {
            logger.error("Unknown error");
            throw new DatabaseError("An unknown error occurred in addUser. Should not happen");
        }
    }  
}

async function getSingleUser(username: string): Promise<User | null> {
    if (!usersCollection) {
        throw new DatabaseError("Database not initialized");
    }
    try {
        const user = await usersCollection.findOne({username});
        return user;
    }catch (err: unknown){
        if (err instanceof MongoError){
            logger.error("MongoDB error: " + err.message);
            throw new DatabaseError("Database operation failed");
        }
        else if(err instanceof DatabaseError) {
            logger.error("Database error: " + err.message);
            throw err;
        } 
        else if (err instanceof Error) {
            logger.error("Unexpected error: " + err.message);
            throw new DatabaseError("An unexpected error occurred");
        } 
          
        else {
            logger.error("Unknown error");
            throw new DatabaseError("An unknown error occurred in getSingleUser. Should not happen");
        }
    }  
}

async function getAllUsers(): Promise<User[]>{
    if (!usersCollection) {
        throw new DatabaseError("Database not initialized");
    }

    try{
        const cursor = await usersCollection.find({});
        const allUsers: User[] = await cursor.toArray();
        return allUsers;
    }
    catch (err: unknown) {
        if (err instanceof MongoError) {
          logger.error("MongoDB error: " + err.message);
          throw new DatabaseError("Database operation failed");
        } else if (err instanceof DatabaseError) {
          logger.error("Database error: " + err.message);
          throw err;
        } else if (err instanceof Error) {
          logger.error("Unexpected error: " + err.message);
          throw new DatabaseError("An unexpected error occurred");
        } else {
          logger.error("Unknown error");
          throw new DatabaseError("An unknown error occurred in getAllUsers. Should not happen");
        }
    }
}

async function updateUser(
    username: string,
    updates: {
        password?: string,
        email?: string,
        birthday?: Date
    }
): Promise<User> {
    if (!usersCollection) {
        throw new DatabaseError("Database not initialized");
    }
    try{
        if (!username || !validator.isAlphanumeric(username)){
            throw new InvalidInputError("Invalid username");
        }
        const setFields: Partial<User> = {};
        
        if (updates.password) {
            if (!validator.isLength(updates.password, {min: 8})){
                throw new InvalidInputError("Invalid password");
            }
            setFields.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
        }
        if (updates.email) {
            if (!validator.isEmail(updates.email)){
                throw new InvalidInputError("Invalid email");
            }
            setFields.email = updates.email;
        }

        if (updates.birthday)
        {
            if (!validator.isDate(updates.birthday.toISOString())){
                throw new InvalidInputError("Invalid birthday");
            }
            let today = new Date();
            let age = today.getFullYear() - updates.birthday.getFullYear();
            const monthDifference = today.getMonth() - updates.birthday.getMonth();
            if (monthDifference <0 || (monthDifference === 0 && today.getDate() < updates.birthday.getDate())){
                age--;
            }
            if (age < 18){
                throw new InvalidInputError("User must be at least 18 years old");
            }
            setFields.birthday = updates.birthday;
        }

        const result = await usersCollection.findOneAndUpdate(
            {username},
            {$set: setFields},
            {returnDocument: "after"}
        );

        if (!result){
            throw new DatabaseError("Update failed, no user found with the given username");
        }
        return result;
    }
    catch (err: unknown){
        if (err instanceof InvalidInputError){
            logger.warn("Invalid input: " + err.message);
            throw err; 
        }
        else if (err instanceof MongoError){
            logger.error("MongoDB error: " + err.message);
            throw new DatabaseError("Database operation failed");
        }
        else if(err instanceof DatabaseError) {
            logger.error("Database error: " + err.message);
            throw err;
        } 
        else if (err instanceof Error) {
            logger.error("Unexpected error: " + err.message);
            throw new DatabaseError("An unexpected error occurred");
        } 
          
        else {
            logger.error("Unknown error");
            throw new DatabaseError("An unknown error occurred in updateUser. Should not happen");
        }
    }
}

async function deleteUser(username: string): Promise<void>{
    if (!usersCollection)
    {
        throw new DatabaseError("Database not initialized");
    }
    try{
     if (!username || !validator.isAlphanumeric(username)){
        throw new InvalidInputError("Invalid username");
        
    }
    const result = await usersCollection.deleteOne({username});
    if (result.deletedCount === 0){
        throw new DatabaseError("Delete failed, no user found with the given username");
    }
    }catch (err: unknown) {
        if (err instanceof InvalidInputError) {
          logger.warn("Invalid input: " + err.message);
          throw err;
        } else if (err instanceof MongoError) {
          logger.error("MongoDB error: " + err.message);
          throw new DatabaseError("Database operation failed");
        } else if (err instanceof DatabaseError) {
          logger.error("Database error: " + err.message);
          throw err;
        } else if (err instanceof Error) {
          logger.error("Unexpected error: " + err.message);
          throw new DatabaseError("An unexpected error occurred");
        } else {
          logger.error("Unknown error");
          throw new DatabaseError("An unknown error occurred in deleteUser. Should not happen");
        }
    }
}

async function checkCredentials(username: string, password: string): Promise<boolean>{

    if(!usersCollection)
    {
        throw new DatabaseError("Database not initialized");
    }

    try{

        const user = await usersCollection.findOne({username});
        if (!user){
            return false;
        } 
        return await bcrypt.compare(password, user.password);
    }catch(err: unknown) {
        if (err instanceof MongoError) {
          logger.error("MongoDB error: " + err.message);
          throw new DatabaseError("Database operation failed");
        } else if (err instanceof DatabaseError) {
          logger.error("Database error: " + err.message);
          throw err;
        } else if (err instanceof Error) {
          logger.error("Unexpected error: " + err.message);
          throw new DatabaseError("An unexpected error occurred");
        } else {
          logger.error("Unknown error");
          throw new DatabaseError("An unknown error occurred in checkCredentials. Should not happen");
        }
      }
}
