
import express from "express";
import type { Request, Response } from "express";
import * as model from "../models/userModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { authenticateUser, refreshSession } from "./sessionController.js";

const router = express.Router();
export const routeRoot = "/users";



router.post("/", registerUser)
async function registerUser(request:any, response:any): Promise<void> {
    try{
        const { username, password, email, birthday} = request.body;
        const result = await model.addUser(username, password, email, new Date(birthday));
        response.status(201).json(result);

    }catch (err: unknown) {
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
async function getSingleUser(request: Request, response: Response): Promise<void>{

    const authenticatedUser = authenticateUser(request);
    if (!authenticatedUser) {
      refreshSession(request, response);
      response.sendStatus(401).send("Unauthorized: Please log in to access this resource.");
      return;
    } 

    try{
        const result = await model.getSingleUser(request.params.username);
        response.status(200).json(result);
    }catch (err: unknown) {
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