import express from "express";
import type { Request, Response } from "express";
import { authenticateUser, refreshSession } from "./sessionController.js";
const router = express.Router();
const routeRoot = "/";
router.get("/", showHome);
function showHome(request: Request, response: Response): void {
  const authenticatedUser = authenticateUser(request);
    if (!authenticatedUser) {
      refreshSession(request, response);
      response.sendStatus(401); 
    return;
}
console.log(`User ${authenticatedUser.userSession.username} is authorized for home page`);

  response.status(200);
  response.send("Welcome to our cool task manager.");
}
export { router, routeRoot };
