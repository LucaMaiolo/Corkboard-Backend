import Express from "express";
import type { Request, Response } from "express";
import * as model from "../models/taskModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";

const router = Express.Router();
const routeRoot = "/tasks";

/**
 * Handles creating a new task in the database
 * Expects a JSON body with the task details
 * @param request - Express request object that reads the following:
 *  request.body.name - name of the task
 *  request.body.description - the description of the task
 * request.body.location - the location of the task
 *  request.body.pay the pay amount of the task
 *  request.body.timeInMins - estimated time in minutes of the task
 * request.body.status - the status of the task
 *
 * @param response - Express response object:
 *  201 on success with the created task name
 *  400 if the input is invalid
 *  500 if a database or unexpected error occurs
 */
router.post("/", addTask);
async function addTask(request: Request, response: Response): Promise<void> {
  try {
    const result = await model.addTask({
      name: request.body.name,
      description: request.body.description,
      location: request.body.location,
      pay: request.body.pay,
      timeInMins: request.body.timeInMins,
      status: request.body.status,
    });
    response.status(201);
    response.send(result);
  } catch (error: unknown) {
    if (error instanceof InvalidInputError) {
      response.status(400).send("Invalid input:" + error.message);
    } else if (error instanceof DatabaseError) {
      response.status(500).send("Database error:" + error.message);
    } else if (error instanceof Error) {
      response.status(500).send("Unexpected error: " + error.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

/**
 * Handles retrieving all tasks from the database.
 *
 * @param _request - Express request object. No parameters needed.
 * @param response - Express response object:
 *  200 with a JSON array of all tasks on success
 *  500 if database or unexpected error occurs
 *
 */
router.get("/", getAllTasks);
async function getAllTasks(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const result = await model.getAllTasks();
    response.send(result);
  } catch (error: unknown) {
    if (error instanceof DatabaseError) {
      response.status(500).send("Database error:" + error.message);
    } else if (error instanceof Error) {
      response.status(500).send("Unexpected error: " + error.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

/**
 * Handles retrieving a single task by name from the database
 * @param request - Express request object. Reads the following:
 *  request.params.name - the name of the task to retrieve
 *
 * @param response - Express response object:
 *  200 with the task as JSON on success
 *  400 if the name is invalid
 *  404 if no task with the given name is found
 *  500 if unexpected error occurs
 *
 */
router.get("/:name", getSingleTask);
async function getSingleTask(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const name = request.params.name as string;
    const result = await model.getSingleTask(name);
    response.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof InvalidInputError) {
      response.status(400).send("Invalid input:" + error.message);
    } else if (error instanceof DatabaseError) {
      if (error.message.includes("Find result was null")) {
        response.status(404).send("Task not found:" + error.message);
      } else {
        response.status(500).send("Database error:" + error.message);
      }
    } else if (error instanceof Error) {
      response.status(500).send("Unexpected error: " + error.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

/**
 * Handles updating an existing task in the database by name.
 * @param request - Express request object. Reads the following:
 *  request.params.name - the name of the task to update
 *  request.body.name - the new name for the task
 *  request.body.description - the new description for the task
 *  request.body.pay - the new pay amount for the task
 *  request.body.estimatedTimeInMins - the new estimated time in minutes
 *
 * @param response - Express response object:
 *  200 with the updated task name on success
 *  400 if any input is invalid
 *  404 if no task with the given name is found
 *  500 if an unexpected error occurs
 *
 */
router.put("/:name", updateTask);
async function updateTask(request: Request, response: Response): Promise<void> {
  try {
    const name = request.params.name as string;
    const result = await model.updateTask(name, {
      name: request.body.name,
      description: request.body.description,
      pay: request.body.pay,
      estimatedTimeInMins: request.body.estimatedTimeInMins,
    });
    response.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof InvalidInputError) {
      response.status(400).send("Invalid input:" + error.message);
    } else if (error instanceof DatabaseError) {
      if (
        error.message.includes(
          "Update failed, no task found with the given name",
        )
      ) {
        response.status(404).send("Task not found:" + error.message);
      } else {
        response.status(500).send("Database error:" + error.message);
      }
    } else if (error instanceof Error) {
      response.status(500).send("Unexpected error: " + error.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

/**
 * Handles deleting a task from the database by name
 * @param request - Expressing request object. Reads the following:
 *  request.params.name - the name of the task to delete
 *
 * @param response - Express response object:
 *  200 with the deleted task name on success
 *  400 if name is invalid
 *  404 if no task with the given name is found
 *  500 if an unexpected error occurs
 */
router.delete("/:name", deleteTask);
async function deleteTask(request: Request, response: Response): Promise<void> {
  try {
    const name = request.params.name as string;
    await model.deleteTask(name);
    response.status(200).send(`Task deleted: name=${name}`);
  } catch (error: unknown) {
    if (error instanceof InvalidInputError) {
      response.status(400).send("Invalid input:" + error.message);
    } else if (error instanceof DatabaseError) {
      if (
        error.message.includes(
          "Delete failed, no task found with the given name",
        )
      ) {
        response.status(404).send("Task not found:" + error.message);
      } else {
        response.status(500).send("Database error:" + error.message);
      }
    } else if (error instanceof Error) {
      response.status(500).send("Unexpected error: " + error.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

export { router, routeRoot };
