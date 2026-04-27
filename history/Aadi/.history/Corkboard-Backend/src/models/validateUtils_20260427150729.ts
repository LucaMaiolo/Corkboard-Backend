import validator from "validator";
import { InvalidInputError } from "./InvalidInputError.js";
import type { Status } from "./taskModelMongoDb.js";
/**
 * Checks the following:
 *
 * `name` must exist and only contain letters
 * `description` must exist and be between 5 and 200 characters
 * `pay` must be a positive number
 * `estimatedTimeInMins` must be a positive number
 *
 * @param name The name of the task
 * @param description A description of the task
 * @param location The location of the task
 * @param pay Payment amount for the task
 * @param TimeInMins Estimated time to complete task in minutes
 * @param status The status of the task
 * @throws {InvalidInputError} Throws if any input is invalid
 * @returns true if all inputs are valid
 */
function isValid(
  name: string,
  description: string,
  location: string,
  pay: number,
  TimeInMins: number,
  status: Status,
) {
  if (!name || !validator.isAlpha(name)) {
    throw new InvalidInputError("Invalid name");
  }
  if (!description || !validator.isLength(description, { min: 5, max: 200 })) {
    throw new InvalidInputError("Invalid description");
  }
  if (!location || !validator.isLength(location)) {
    throw new InvalidInputError();
  }
  if (pay <= 0) {
    throw new InvalidInputError("Invalid pay");
  }
  if (TimeInMins <= 0) {
    throw new InvalidInputError("Invalid estimated time");
  }
  if (!status) {
    throw new InvalidInputError("Invalid status");
  }

  return true;
}
export { isValid };
