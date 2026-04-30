import { v4 as uuidv4 } from 'uuid';


export class Session {
    username: string;
    expiresAt: Date; 
    password: string;

    constructor(username: string, expiresAt: Date) {
        this.username = username;
        this.expiresAt = expiresAt;
    }

    isExpired(): boolean
    {
        return this.expiresAt < new Date(); 
    }

}
const sessions: Record<string, Session> = {};

export function createSession(username:string, numMinutes:number):string {
    // Generate a random UUID as the sessionId
    const sessionId: string = uuidv4();

    // Set the expiry time as numMinutes (in milliseconds) after the current time
    const expiresAt: Date = new Date(Date.now() + numMinutes * 60000);

    // Create a session object containing information about the user and expiry time
    const thisSession: Session = new Session(username, expiresAt);

    // Add the session information to the sessions map, using sessionId as the key
    sessions[sessionId] = thisSession;

    return sessionId;
}

export function getSession (sessionId: string): Session | undefined{
    return sessions[sessionId];
}

export function deleteSession(sessionId: string): void {
    delete sessions[sessionId];
  }

  
module.exports = {sessions, createSession, getSession, deleteSession};
