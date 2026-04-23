import { MongoError, Db, MongoClient, Collection } from "mongodb";

let client : MongoClient;
let tasksCollection: Collection<Task>| undefined;

enum Status {
    INCOMPLETED,
}

interface Task {
    name: string;
    description: string;
    pay: number;
    timeInMins: number;
    status: ;


}