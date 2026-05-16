import express, { type Request, type Response } from "express";
import { authenticateUser } from "./sessionController.js";
const router = express.Router();
const routeRoot = "/";
router.get("/", showHome);
function showHome(request: Request, response: Response): void {
  const authenticatedUser = authenticateUser(request);
  if (!authenticatedUser) {
    response.sendStatus(401);
    return;
  }
  console.log(
    `User ${authenticatedUser.userSession.username} is authorized for home page`,
  );

  response.status(200).json({
    message: "Welcome!",
    username: authenticatedUser.userSession.username,
  });
}
export { router, routeRoot };
