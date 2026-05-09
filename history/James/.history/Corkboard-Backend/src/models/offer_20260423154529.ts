import type Task from "./Task.js";
import type User from "./User.js";

export interface Offer {
	id: number;
	task: Task;
	requester: User;
	message?: string;
}
