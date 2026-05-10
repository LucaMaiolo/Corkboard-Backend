
import express from "express";
import type { Request, Response } from "express";
import * as model from "../models/userModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { authenticateUser, refreshSession } from "./sessionController.js";

const router = express.Router();
export const routeRoot = "/users";



router.post("/")
async function registerUser(request:any, response:any): Promise<void> {
    try{
        const { username, password, email, birthday} = request.body;
        const result = await model.addUser(username, password, email, new Date(birthday));
        response.status(201).json(result);

    }

}