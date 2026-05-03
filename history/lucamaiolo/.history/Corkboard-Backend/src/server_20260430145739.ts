import * as model from "./models/taskModelMongoDb.js";
import app from "./app.js";
const port: number = 1339;
const url = `${process.env.URL_PRE}${process.env.MONGODB_PWD}${process.env.URL_POST}`;
model
  .initialize("Corkboard", false, "Tasks", url)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
    });
  })
  .catch((error: Error) => {
    console.error("Error initializing the database:", error);
  });
