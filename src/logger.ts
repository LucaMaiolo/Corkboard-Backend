import pino from "pino";

// pino.transport() spawns a worker thread via module.register(), which Node >=26 deprecated (DEP0205) and broke.
// pino.multistream() does the same thing (stdout + file) synchronously on the main thread — no worker, no crash.
const minimun_log_level = "debug";
const logger =
  process.env.LOG_TO_CONSOLE_ONLY === "true"
    ? pino({
        level: process.env.PINO_LOG_LEVEL || minimun_log_level,
      })
    : pino(
        {
          level: process.env.PINO_LOG_LEVEL || minimun_log_level,
        },
        pino.multistream([
          { stream: process.stdout, level: "trace" },
          { stream: pino.destination("logs/trace.log"), level: "trace" },
        ]),
      );

export default logger;
