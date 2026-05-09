import * as taskModel from "./models/taskModelMongoDb.js";
import * as offerModel from "./models/offerModelMongoDb.js";
import "dotenv/config";
import app from "./app.js";
const port: number = 1339;
const url = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;
try {
  await Promise.all([
    taskModel.initialize("Corkboard", false, "Tasks", url),
    offerModel.initialize("Corkboard", false, "Offers", url),
  ]);
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
} catch (error) {
  if (error instanceof Error) {
    console.error("Error initializing the database:", error.message);
  } else {
    console.error("Error initializing the database:", error);
  }
}

