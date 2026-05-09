import type Task from "./Task.js";
import type User from "./User.js";

export enum Status {
	Accepted,
	Declined,
	Pending
}

export interface Offer {
	id: number;
	task: Task;
	requester: User;
	price: number;
	message?: string;
	status: Status
}
