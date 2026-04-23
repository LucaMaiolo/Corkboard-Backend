import { MongoError, Db, MongoClient, Collection } from "mongodb";

let client: MongoClient;
let tasksCollection: Collection<Task> | undefined;

enum Status {
  AVAILABLE = "AVAILABLE",
  INPROGRESS = "INPROGRESS",
  COMPLETED = "COMPLETED",
}

interface Task {
  name: string;
  description: string;
  pay: number;
  timeInMins: number;
  status: Status;
}
