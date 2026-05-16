import {
  MongoError,
  Db,
  MongoClient,
  Collection,
  ObjectId,
  WithId,
} from "mongodb";
import { DatabaseError } from "./DatabaseError.js";
import { InvalidInputError } from "./InvalidInputError.js";
import { isValidTask } from "./validateUtils.js";
import logger from "../logger.js";

let client: MongoClient;
let tasksCollection: Collection<Task> | undefined;

/**
 * Represents the lifecycle status of a task
 */
enum TaskStatus {
  AVAILABLE = "Available",
  INPROGRESS = "InProgress",
  COMPLETED = "Completed",
}

/**
 * Represents a task stored in MongoDB
 */
interface Task {
  listerId: string;
  name: string;
  description: string;
  location: string;
  pay: number;
  timeInMins: number;
  status: TaskStatus;
}

/**
 * Connects to MongoDB and prepares the task collection
 *
 * @param dbName -The name of the database to connect to
 * @param resetFlag
 * @param collection
 * @param url
 */
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
async function addTask(task: Task): Promise<WithId<Task>> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValidTask(
      task.name,
      task.description,
      task.location,
      task.pay,
      task.timeInMins,
      task.status,
    );
    const result = await tasksCollection.insertOne(task);
    return { ...task, _id: result.insertedId };
  } catch (err: unknown) {
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
      throw new DatabaseError("An unexpected error occured");
    } else {
      logger.error("Unknown error");
      throw new DatabaseError(
        "An unknown error occurred in addTask. Should not happen",
      );
    }
  }
}

/**
 * finds and returns an array of all `task`s in the MongoDb collection.
 *
 * @returns an array of all tasks in the MongoDb collection.
 * @throws {DatabaseError} Throws if there is an error during database operation.
 */
async function getAllTasks(): Promise<WithId<Task>[]> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    const cursor = tasksCollection.find({});
    const allTask: WithId<Task>[] = await cursor.toArray();
    return allTask;
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

/**
 * finds and returns the task with the given mongodb `_id`.
 *
 * @param id - the ObjectId of the task to retrieve.
 * @returns the task document.
 * @throws {DatabaseError} if no task is found or a db error occurs.
 */
async function getTaskById(id: ObjectId): Promise<WithId<Task>> {
  if (!tasksCollection) throw new DatabaseError("Collection not initialized");
  try {
    const match = await tasksCollection.findOne({ _id: id });
    if (!match) throw new DatabaseError("Task not found");
    return match;
  } catch (err: unknown) {
    if (err instanceof DatabaseError) throw err;
    else if (err instanceof MongoError)
      throw new DatabaseError("Database operation failed");
    else if (err instanceof Error)
      throw new DatabaseError("An unexpected error occurred");
    else
      throw new DatabaseError(
        "An unknown error occurred in getTaskById. Should not happen",
      );
  }
}

/**
 * Updates the task with the name `oldName` to have the properties of the given `task`.
 *
 * @param oldName - the name of the task to be updated.
 * @param task - the updated task object.
 * @returns - the updated task object.
 * @throws {InvalidInputError} Throws if any input is invalid
 * @throws {DatabaseError} Throws if there is an error during database operation or if no task is found with given name.
 */
async function updateTask(
  id: ObjectId,
  task: Omit<Task, "listerId">,
): Promise<WithId<Task>> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValidTask(
      task.name,
      task.description,
      task.location,
      task.pay,
      task.timeInMins,
      task.status,
    );
    const result = await tasksCollection.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          name: task.name,
          description: task.description,
          location: task.location,
          pay: task.pay,
          timeInMins: task.timeInMins,
          status: task.status,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      throw new DatabaseError("Update failed, no task found with the given id");
    }
    return result;
  } catch (err: unknown) {
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
      throw new DatabaseError(
        "An unknown error occurred in updateTask. Should not happen",
      );
    }
  }
}

/**
 * Deletes the task with the given `name` from the MongoDb collection.
 *
 * @param name - the name of the task to be deleted.
 * @throws {InvalidInputError} Throws if the name is invalid
 * @throws {DatabaseError} Throws if there is an error during database operation or if no task is found with the given name.
 */
async function deleteTask(id: ObjectId): Promise<void> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    const result = await tasksCollection.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new DatabaseError(
        "Delete failed, no task found with the given name",
      );
    }
  } catch (err: unknown) {
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
      throw new DatabaseError(
        "An unknown error occurred in deleteTask. Should not happen",
      );
    }
  }
}
/**
 * Closes the connection to the MongoDb database.
 */
async function close(): Promise<void> {
  if (client) {
    await client.close();
  }
}
export {
  initialize,
  addTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  close,
};
export type { Task, TaskStatus as Status };
