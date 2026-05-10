import { v4 as uuidv4 } from "uuid";
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT:", err);
  process.exit(1);
});

class Session {
  username: string;
  expiresAt: Date;
  isAdmin: boolean;

  constructor(username: string, expiresAt: Date, isAdmin: boolean) {
    this.username = username;
    this.expiresAt = expiresAt;
    this.isAdmin = isAdmin;
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}
const sessions: Record<string, Session> = {};

function createSession(username: string, numMinutes: number, isAdmin: boolean): string {
  // Generate a random UUID as the sessionId
  const sessionId: string = uuidv4();

  // Set the expiry time as numMinutes (in milliseconds) after the current time
  const expiresAt: Date = new Date(Date.now() + numMinutes * 60000);

  // Create a session object containing information about the user and expiry time
  const thisSession: Session = new Session(username, expiresAt, isAdmin);

  // Add the session information to the sessions map, using sessionId as the key
  sessions[sessionId] = thisSession;

  return sessionId;
}

function getSession(sessionId: string): Session | undefined {
  return sessions[sessionId];
}

function deleteSession(sessionId: string): void {
  delete sessions[sessionId];
}

export { Session, createSession, getSession, deleteSession };
