import express, { Request, Response, Router } from "express";
import { Session, createSession, getSession, deleteSession } from "./session.js"; 
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


  interface AuthenticatedUser {
    sessionId: string;
    userSession: Session;
  }
  function authenticateUser(request: Request): AuthenticatedUser | null {
    // If this request doesn't have any cookies, that means it isn't authenticated. Return null.
    if (!request.cookies) {
      return null;
    }
    // We can obtain the session token from the requests cookies, which come with every request
    const sessionId = request.cookies['sessionId'];
    if (!sessionId) {  // If the cookie is not set, return null
      return null;
    }
    // We then get the session of the user from our session map
    const userSession = getSession(sessionId);
    if (!userSession) {
      return null;
    }
    // If the session has expired, delete the session from our map and return null
    if (userSession.isExpired()) {
      deleteSession(sessionId);
      return null;
    }
    return { sessionId, userSession }; // Successfully validated
  }

  
  export { router, routeRoot, loginUser, authenticateUser };
