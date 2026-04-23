import express from "express";
import type { Request, Response } from "express";
const router = express.Router();
const routeRoot = "/";
router.get("/", showHome);
function showHome(request: Request, response: Response): void {
  response.status(200);
  response.send("Welcome to our cool task manager.");
}
export { router, routeRoot };
