import express, { NextFunction, Request, Response, Router } from "express";
import { checkCredentials, getSingleUser } from "../models/userModelMongoDb.js";
import {
  createSession,
  getSession,
  deleteSession,
  Session,
} from "./Session.js";
const router: Router = express.Router();
const routeRoot: string = "/session";
const SESSION_MINUTES = 10;
const REMEMBER_ME_MINUTES = 7 * 24 * 6; // 1 week (units match Session.ts multiplier)
interface AuthenticatedUser {
  sessionId: string;
  userSession: Session;
}

router.post("/login", loginUser);

/**
 * logs in a user by verifying credentials and setting a session cookie.
 * @param request - expects `body.username`, `body.password`, and optional `body.rememberMe`
 * @param response - 200 on success, 401 on bad credentials, 404 if user not found, 500 on session failure
 */
async function loginUser(request: Request<{}, {}, { username: string; password: string; rememberMe: boolean }>, response: Response): Promise<void> {
  const username: string = request.body.username;
  const password: string = request.body.password;
  const rememberMe = request.body.rememberMe;

  console.log("Login attempt:", username, "password length:", password?.length);
  const result = await checkCredentials(username, password);
  console.log("checkCredentials result:", result);
  if (result) {
    const user = await getSingleUser(username);
    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }
    const sessionDuration = rememberMe ? REMEMBER_ME_MINUTES : SESSION_MINUTES;
    const sessionId: string = createSession(username, sessionDuration, user.isAdmin);
    const session = getSession(sessionId);
    if (!session) {
      response.status(500).send("Session creation failed.");
      return;
    }
    response.cookie("sessionId", sessionId, {
      expires: session.expiresAt,
      httpOnly: true,
    });
    response.status(200).json("Logged in successfully.");
  } else {
    response.status(401).json({ message: "Invalid username or password." });
  }
}

/**
 * validates the session cookie on the request and returns the authenticated user.
 * @param request - the incoming request, expected to carry a `sessionId` cookie
 * @returns the authenticated user and session, or null if unauthenticated or expired
 */
function authenticateUser(request: Request): AuthenticatedUser | null {
  // If this request doesn't have any cookies, that means it isn't authenticated. Return null.
  if (!request.cookies) {
    return null;
  }
  // We can obtain the session token from the requests cookies, which come with every request
  const sessionId = request.cookies["sessionId"];
  if (!sessionId) {
    // If the cookie is not set, return null
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

/**
 * replaces the current session with a new one, extending the expiry. sends 401 if not authenticated.
 * @param request - must carry a valid `sessionId` cookie
 * @param response - sets a new session cookie on success, 401 if unauthenticated
 * @returns the new session ID, or undefined if unauthenticated
 */
function refreshSession(
  request: Request,
  response: Response,
): string | undefined {
  const authenticatedUser = authenticateUser(request);

  if (!authenticatedUser) {
    response.sendStatus(401); // Unauthorized access
    return;
  }
  // Create and store a new Session object that will expire in 5 minutes.
  const newSessionId: string = createSession(
    authenticatedUser.userSession.username,
    SESSION_MINUTES,
    authenticatedUser.userSession.isAdmin,
  );
  // Delete the old entry in the session map
  deleteSession(authenticatedUser.sessionId);

  const newSession = getSession(newSessionId);
  // If session is undefined (shouldn't happen, but just in case), clear out cookie
  if (!newSession) {
    response.clearCookie("sessionId"); // essentially the user is no longer authenticated
  } else {
    // Set the session cookie to the new id we generated, with a renewed expiration time
    response.cookie("sessionId", newSessionId, {
      expires: newSession.expiresAt,
      httpOnly: true,
    });
  }
  return newSessionId;
}

router.get("/current", getCurrentUser);
/**
 * returns the currently authenticated user's username and admin status.
 * @param request - must carry a valid `sessionId` cookie
 * @param response - 200 with `{ username, isAdmin }`, or 401 if not logged in
 */
function getCurrentUser(request: Request, response: Response): void {
  const authenticatedUser = authenticateUser(request);
  if (authenticatedUser === null) {
    response.status(401).send("Not logged in");
    return;
  }
  response
    .status(200)
    .json({ username: authenticatedUser.userSession.username, isAdmin: authenticatedUser.userSession.isAdmin });
}

router.get("/logout", logoutUser);
/**
 * logs out the current user by deleting their session and clearing the cookie.
 * @param request - must carry a valid `sessionId` cookie
 * @param response - redirects to `/` on success, 401 if not authenticated
 */
function logoutUser(request: Request, response: Response): void {
  const authenticatedUser = authenticateUser(request);

  if (!authenticatedUser) {
    response.sendStatus(401); // Unauthorized access
    return;
  }

  // Delete the session from the session store
  deleteSession(authenticatedUser.sessionId);
  console.log("Logged out user " + authenticatedUser.userSession.username);

  // Clear cookie
  response.clearCookie("sessionId");

  // Redirect to the home page or another route
  response.redirect("/");
}

/**
 * middleware that extends the session expiry on every authenticated request (sliding window).
 * passes through unauthenticated requests without blocking them.
 * @param request - incoming request
 * @param response - outgoing response; a refreshed cookie is set if the user is authenticated
 * @param next - calls the next middleware or route handler
 */
const refreshSessionMiddleware = (request: Request, response: Response, next: NextFunction): void => {
  const authenticatedUser = authenticateUser(request);
  if (authenticatedUser !== null) {
    // extend expiry in place so route handlers on this same request still find the session
    authenticatedUser.userSession.expiresAt = new Date(Date.now() + SESSION_MINUTES * 60000); // 60000 = ms in minute
    response.cookie("sessionId", authenticatedUser.sessionId, { expires: authenticatedUser.userSession.expiresAt, httpOnly: true });
  }
  next();
};

export { router, routeRoot, loginUser, authenticateUser, refreshSession, refreshSessionMiddleware, logoutUser};
