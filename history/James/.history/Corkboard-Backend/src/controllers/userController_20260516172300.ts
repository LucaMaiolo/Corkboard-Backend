import express from "express";
import type { Request, Response } from "express";
import * as model from "../models/userModelMongoDb.js";
import * as taskModel from "../models/taskModelMongoDb.js";
import * as offerModel from "../models/offerModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { authenticateUser, refreshSession } from "./sessionController.js";

const router = express.Router();
export const routeRoot = "/users";


router.post("/", registerUser);
/**
 * POST /users
 * Registers a new account
 * @param request - expects a JSON body with the following fields:
 *  - username: string, required, 3-30 chars, letters/numbers/underscores only
 * - password: string, required, min 8 chars
 * - email: string, required, valid email format
 * - birthday: string, required, ISO date format (YYYY-MM-DD)
 * @param response - 201 with created user on success, 400 on invalid input, 500 on database or unexpected error
 */
async function registerUser(request: any, response: any): Promise<void> {
  try {
    const { username, password, email, birthday } = request.body;
    const result = await model.addUser(username, password, email, new Date(birthday));
    response.status(201).json(result);
  } catch (err: unknown) {
    if (err instanceof InvalidInputError) {
      response.status(400).send("Invalid input: " + err.message);
    } else if (err instanceof DatabaseError) {
      response.status(500).send("Database error: " + err.message);
    } else if (err instanceof Error) {
      response.status(500).send("Unexpected error: " + err.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}


/**
 * GET /users
 * Retrieves all users. Requires authentication and admin privileges.
 * @param request - must include a valid session cookie
 * @param response - 200 with array of users on success, 401 if not authenticated, 403 if not admin, 500 for server errors
 */
router.get("/", getAllUsers);
async function getAllUsers(request: Request, response: Response): Promise<void> {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    refreshSession(request, response);
    response.sendStatus(401).send("Unauthorized: Please log in to access this resource.");
    return;
  }

  try {
    const user = await model.getSingleUser(authenticatedUser.userSession.username);
    if (user && !user.isAdmin) {
      response.sendStatus(403).send("Forbidden: You do not have permission to access this resource.");
      return;
    }

    const result = await model.getAllUsers();
    response.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof DatabaseError) {
      response.status(500).send("Database error: " + err.message);
    } else if (err instanceof Error) {
      response.status(500).send("Unexpected error: " + err.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}


/**
 * GET /users/:username
 * Retrievies a single user by username
 * @param request - must include a valid session cookie; params.username is the target username
 * @param response - 200 with the user object on success, 401 if not authenticated, 404 if not found, 500 for server errors
 */
router.get("/:username", getSingleUser);
async function getSingleUser(request: Request, response: Response): Promise<void> {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    refreshSession(request, response);
    response.sendStatus(401).send("Unauthorized: Please log in to access this resource.");
    return;
  }

  try {
    const username = request.params.username;

    if (typeof username !== "string") {
      response.status(400).send("Invalid input: username must be a string.");
      return;
    }
    const result = await model.getSingleUser(username);
    response.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof InvalidInputError) {
      response.status(400).send("Invalid input: " + err.message);
    } else if (err instanceof DatabaseError) {
      if (err.message.includes("Find result was null")) {
        response.status(404).send("User not found: " + err.message);
      } else {
        response.status(500).send("Database error: " + err.message);
      }
    } else if (err instanceof Error) {
      response.status(500).send("Unexpected error: " + err.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}
/**
 * PUT /users/:username
 * Updates a user's account information. Requires authentication.
 * Users may only update their own account; admins may update any account.
 * Non-admins must provide their current password to make changes.
 * @param request - must include a valid session cookie; body may contain { currentPassword, password, email, birthday }
 * @param response - 200 with updated user on success, 401 if not authenticated or wrong password, 403 if forbidden, 400 for invalid input, 404 if not found, 500 for server errors
 */
router.put("/:username", updateUser);
async function updateUser(request: Request, response: Response): Promise<void> {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    refreshSession(request, response);
    response.sendStatus(401);
    return;
  }

  const username = request.params.username as string;

  if (authenticatedUser.userSession.username !== username && !authenticatedUser.userSession.isAdmin) {
    response.sendStatus(403);
    return;
  }

  const isAdmin = authenticatedUser.userSession.isAdmin;

  if (!isAdmin) {
    const currentPassword: string = request.body.currentPassword;
    const isCorrect = await model.checkCredentials(username, currentPassword);
    if (!isCorrect) {
      response.status(401).send("Current password is incorrect.");
      return;
    }
  }

  try {
    const updates: { password?: string; email?: string; birthday?: Date } = {};
    if (request.body.password !== undefined) updates.password = request.body.password;
    if (request.body.email !== undefined) updates.email = request.body.email;
    if (request.body.birthday !== undefined) updates.birthday = new Date(request.body.birthday);

    const result = await model.updateUser(username, updates);
    response.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof InvalidInputError) {
      response.status(400).send("Invalid input: " + err.message);
    } else if (err instanceof DatabaseError) {
      if (err.message.includes("no user found with the given username")) {
        response.status(404).send("User not found: " + err.message);
      } else {
        response.status(500).send("Database error: " + err.message);
      }
    } else if (err instanceof Error) {
      response.status(500).send("Unexpected error: " + err.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

/**
 * DELETE /users/:username
 * Deletes a user account. Requires authentication.
 * Users may only delete their own account; admins may delete any account.
 * @param request - must include a valid session cookie; params.username is the target username
 * @param response - 200 on success, 401 if not authenticated, 403 if forbidden, 404 if not found, 500 for server errors
 */
router.delete("/:username", deleteUser);
async function deleteUser(request: Request, response: Response): Promise<void> {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    refreshSession(request, response);
    response.sendStatus(401);
    return;
  }

  if (authenticatedUser.userSession.username !== request.params.username && !authenticatedUser.userSession.isAdmin) {
    response.sendStatus(403);
    return;
  }

  try {
    const username = request.params.username as string;
    const allTasks = await taskModel.getAllTasks();
    const userTasks = allTasks.filter((task) => task.listerId === username);
    const taskDeletions = userTasks.map((task) => taskModel.deleteTask(task._id));
    const submittedOfferDeletion = offerModel.deleteOffersByUser(username);
    await Promise.all([...taskDeletions, submittedOfferDeletion]);
    await model.deleteUser(username);
    response.status(200).send(`User deleted: username=${username}`);
  } catch (err: unknown) {
    if (err instanceof InvalidInputError) {
      response.status(400).send("Invalid input: " + err.message);
    } else if (err instanceof DatabaseError) {
      if (err.message.includes("no user found with the given username")) {
        response.status(404).send("User not found: " + err.message);
      } else {
        response.status(500).send("Database error: " + err.message);
      }
    } else if (err instanceof Error) {
      response.status(500).send("Unexpected error: " + err.message);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
}

export { router };
