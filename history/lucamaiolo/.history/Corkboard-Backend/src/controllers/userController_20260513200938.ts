import express from "express";
import type { Request, Response } from "express";
import * as model from "../models/userModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { authenticateUser, refreshSession } from "./sessionController.js";

const router = express.Router();
export const routeRoot = "/users";

router.post("/", registerUser);
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

router.put("/:username", updateUser);
async function updateUser(request: Request, response: Response): Promise<void> {
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

  const isAdmin = authenticatedUser.userSession.isAdmin;


if (!isAdmin) {
  const currentPassword: string = request.body.currentPassword;
  const isCorrect = await model.checkCredentials(request.params.username, currentPassword);
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

    const result = await model.updateUser(request.params.username, updates);
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

router.delete("/:username", deleteUser);
async function deleteUser(request: Request, response: Response): Promise<void> {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    refreshSession(request, response);
    response.sendStatus(401);
    return;
  }

  if (authenticatedUser.userSession.username !== request.params.username || !authenticatedUser.userSession.isAdmin) {
    response.sendStatus(403);
    return;
  }

  try {
    await model.deleteUser(request.params.username);
    response.status(200).send(`User deleted: username=${request.params.username}`);
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
