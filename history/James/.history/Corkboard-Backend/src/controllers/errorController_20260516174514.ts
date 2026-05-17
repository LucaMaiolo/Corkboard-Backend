import express, { type Request, type Response } from "express";
const router = express.Router();
const routeRoot = "/";
router.all("*path", handleError);
function handleError(_request: Request, response: Response): void {
  response.status(404);
  response.send("Invalid URL entered.  Please try again.");
}
export { router, routeRoot };
