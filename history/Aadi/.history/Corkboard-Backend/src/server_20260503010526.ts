import dotenv from "dotenv";
dotenv.config();
import * as model from "./models/taskModelMongoDb.js";
import app from "./app.js";
const port: number = 1339;
const url = process.env.MONGO_URI!;
console.log("URL:", url);
model
  .initialize("tasksDb", false, "tasks", url)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
    });
  })
  .catch((error: Error) => {
    console.error("Error initializing the database:", error);
  });
