import express, { Request, Response, Router } from "express";
import { createSession, getSession, deleteSession, Session } from "./Session.js"; 
const router: Router = express.Router();
const routeRoot: string = "/session";
interface AuthenticatedUser {
    sessionId: string;
    userSession: Session;
  }

router.post("/login", loginUser)
/** Log a user in and create a session cookie that will expire in 2 minutes */
function loginUser(request: Request, response: Response): void {
    // Let's assume successful login for now with placeholder username
    const username: string = request.body.username;
    const password: string = request.body.password;

    if (checkCredentials(username, password)){
        const sessionId: string = createSession(username, 2);
        const session = getSession(sessionId);
        // Create a session object that will expire in 2 minutes
        if (!session) {
          response.status(500).send("Session creation failed.");
          return;
        }
        // Save cookie that will expire.
        response.cookie("sessionId", sessionId, { expires: session.expiresAt, httpOnly: true });

    }else{
        response.status(401).send("Invalid username or password.");
    }
    response.redirect("/");  
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



function refreshSession(request: Request, response: Response): string | undefined {
    const authenticatedUser = authenticateUser(request);

    if (!authenticatedUser) {
        response.sendStatus(401); // Unauthorized access
        return;
    }
    // Create and store a new Session object that will expire in 2 minutes.
    const newSessionId: string = createSession(authenticatedUser.userSession.username, 2);
    // Delete the old entry in the session map
    deleteSession(authenticatedUser.sessionId);

    const newSession = getSession(newSessionId);
    // If session is undefined (shouldn't happen, but just in case), clear out cookie
    if (!newSession) {   
        response.clearCookie("sessionId"); // essentially the user is no longer authenticated
    } else {
        // Set the session cookie to the new id we generated, with a renewed expiration time
        response.cookie("sessionId", newSessionId, { expires: newSession.expiresAt, httpOnly: true });
    }
    return newSessionId;
} 

router.get('/logout', logoutUser);
function logoutUser(request: Request, response: Response): void {
    const authenticatedUser = authenticateUser(request);

    if (! authenticatedUser) {
        response.sendStatus(401); // Unauthorized access
        return;
    }

    // Delete the session from the session store
    deleteSession(authenticatedUser.sessionId);
    console.log("Logged out user " + authenticatedUser.userSession.username);

    // Clear cookie
    response.clearCookie("sessionId");

    // Redirect to the home page or another route
    response.redirect('/');
}

export { router, routeRoot, loginUser, authenticateUser, refreshSession, logoutUser};
