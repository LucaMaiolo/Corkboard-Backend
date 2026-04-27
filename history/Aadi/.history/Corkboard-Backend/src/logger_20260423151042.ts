import pino from "pino";
const transport = pino.transport({
  targets: [
    {
      level: "trace",
      target: "pino/file",
      options: { destination: "logs/trace.log" },
    },
    {
      level: "trace",
      target: "pino/file",
    },
  ],
});

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
        transport,
      );

export default logger;
