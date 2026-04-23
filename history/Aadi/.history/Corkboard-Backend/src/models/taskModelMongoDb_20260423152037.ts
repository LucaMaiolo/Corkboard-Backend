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
  location: string;
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
async function addTask(task: Task): Promise<Task> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValid(task.name, task.description, task.pay, task.estimatedTimeInMins);
    await tasksCollection.insertOne(task);
    return task;
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
 * finds and returns the `task` with the given `name` from the MongoDb collection.
 * The `name` must pass validation.
 *
 * @param name - the name of the task to be retrieved.
 * @returns - the task with the given name.
 * @throws {InvalidInputError} Throws if the name is invalid
 * @throws {DatabaseError} Throws if there is an error during database operation or if no task is found with the given name.
 */
async function getSingleTask(name: string): Promise<Task> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValid(name, "validDescription", 1, 1); //calling to see if name is valid, other parameters are dummy and not used in validation
    const match = await tasksCollection.findOne<Task>({ name: name });
    if (!match) {
      throw new DatabaseError("Find result was null");
    }
    return match;
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
        "An unknown error occurred in getSingleTask. Should not happen",
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
async function getAllTasks(): Promise<Task[]> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    const cursor = await tasksCollection.find<Task>({});
    const allTask: Task[] = await cursor.toArray();
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
 * Updates the task with the name `oldName` to have the properties of the given `task`.
 *
 * @param oldName - the name of the task to be updated.
 * @param task - the updated task object.
 * @returns - the updated task object.
 * @throws {InvalidInputError} Throws if any input is invalid
 * @throws {DatabaseError} Throws if there is an error during database operation or if no task is found with given name.
 */
async function updateTask(oldName: string, task: Task): Promise<Task> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValid(task.name, task.description, task.pay, task.estimatedTimeInMins);
    const result = await tasksCollection.findOneAndUpdate(
      { name: oldName },
      {
        $set: {
          name: task.name,
          description: task.description,
          pay: task.pay,
          estimatedTimeInMins: task.estimatedTimeInMins,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      throw new DatabaseError(
        "Update failed, no task found with the given name",
      );
    }
    return result as Task;
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
async function deleteTask(name: string): Promise<void> {
  if (!tasksCollection) {
    throw new DatabaseError("Collection not initialized");
  }
  try {
    isValid(name, "validDescription", 1, 1); // Validate name, other parameters are dummy
    const result = await tasksCollection.deleteOne({ name });
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
  getSingleTask,
  getAllTasks,
  updateTask,
  deleteTask,
  close,
};
export type { Task };
