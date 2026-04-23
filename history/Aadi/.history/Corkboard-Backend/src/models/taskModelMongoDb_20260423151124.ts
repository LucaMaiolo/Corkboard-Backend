import { MongoError, Db, MongoClient, Collection } from "mongodb";
import { DatabaseError } from "./DatabaseError";
import logger from "../logger";

let client: MongoClient;
let tasksCollection: Collection<Task> | undefined;

enum Status {
  AVAILABLE = "AVAILABLE",
  INPROGRESS = "INPROGRESS",
  COMPLETED = "COMPLETED",
}

interface Task {
  name: string;
  description: string;
  pay: number;
  timeInMins: number;
  status: Status;
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
    tasksCollection = db.collection<Task>(collection);

    logger.info("Connected to MongoDB:" + dbName);
  } catch (err: unknown) {
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
      throw new DatabaseError(
        "An unknown error occurred in getAllTask. Should not happen",
      );
    }
  }
}
