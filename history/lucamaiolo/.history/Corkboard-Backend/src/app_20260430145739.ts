import express from "express";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import expressListRoutes from "express-list-routes";
import cors from "cors";
const app = express();
const httpLogger = pinoHttp({
  logger: logger,
});
app.use(cors());
app.use(httpLogger);
// errorController must always be last in this list
const controllers: string[] = [
  "homeController.js",
  "taskController.js",
  "sessionController.js",
  "errorController.js",
];
app.use(express.json());
async function registerControllers() {
  for (const controllerName of controllers) {
    try {
      const controllerRoutes = await import(`./controllers/${controllerName}`);
      if (
        controllerRoutes &&
        controllerRoutes.routeRoot &&
        controllerRoutes.router
      ) {
        app.use(controllerRoutes.routeRoot, controllerRoutes.router);
      } else {
        throw new Error(`Invalid controller format: ${controllerName}`);
      }
    } catch (error) {
      console.log(error);
      throw error; // Could fail gracefully, but this would hide bugs later on
    }
  }
}
await registerControllers();
expressListRoutes(app, { prefix: "/" });
export default app;
