import express from "express";
import type { Request, Response } from "express";
const router = express.Router();
const routeRoot = "/";
router.all("/{*splat}", handleError);
function handleError(request: Request, response: Response): void {
  response.status(404);
  response.send("Invalid URL entered.  Please try again.");
}
export { router, routeRoot };
