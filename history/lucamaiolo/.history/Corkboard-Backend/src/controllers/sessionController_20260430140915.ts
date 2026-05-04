import express, { Request, Response, Router } from "express";
import { Session, createSession, getSession } from "./session.js"; 
const router: Router = express.Router();
const routeRoot: string = "/session";


router.get("/login", loginUser)
/** Log a user in and create a session cookie that will expire in 2 minutes */
function loginUser(request: Request, response: Response): void {
    // Let's assume successful login for now with placeholder username
    const username: string = "Joe";
  
    // Create a session object that will expire in 2 minutes
    const sessionId: string = createSession(username, 2);
  
    const session = getSession(sessionId);
    if (!session) {
      response.status(500).send("Session creation failed.");
      return;
    }
  
    // Save cookie that will expire.
    response.cookie("sessionId", sessionId, { expires: session.expiresAt, httpOnly: true });
  
    response.redirect("/");
  }

  export { router, routeRoot, loginUser };
