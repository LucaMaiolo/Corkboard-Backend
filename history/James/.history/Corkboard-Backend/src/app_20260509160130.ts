import express from "express";
import { pinoHttp } from "pino-http";
import logger from "./logger.js";
import expressListRoutes from "express-list-routes";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const httpLogger = pinoHttp({
  logger: logger,
});
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(httpLogger);
// errorController must always be last in this list
const controllers: string[] = [
  "homeController.js",
  "taskController.js",
  "offerController.js",
  "sessionController.js",
  "errorController.js",
];
app.use(express.json());
app.use(cookieParser());

interface Controller {
  routeRoot: string;
  router: express.Router;
}

async function registerControllers(): Promise<void> {
  for (const controllerName of controllers) {
    try {
      const controllerRoutes = await import(`./controllers/${controllerName}`) as Controller;
      app.use(controllerRoutes.routeRoot, controllerRoutes.router);
    } catch (error) {
      console.log(error);
      throw error; // Could fail gracefully, but this would hide bugs later on
    }
  }
}
await registerControllers();
expressListRoutes(app, { prefix: "/" });
export default app;
