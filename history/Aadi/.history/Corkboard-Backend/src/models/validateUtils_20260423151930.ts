import validator from "validator";
import { InvalidInputError } from "./InvalidInputError.js";
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
 * @param pay Payment amount for the task
 * @param estimatedTimeInMins Estimated time to complete task in minutes
 * @throws {InvalidInputError} Throws if any input is invalid
 * @returns true if all inputs are valid
 */
function isValid(
  name: string,
  description: string,
  pay: number,
  estimatedTimeInMins: number,
) {
  if (!name || !validator.isAlpha(name)) {
    throw new InvalidInputError("Invalid name");
  }
  if (!description || !validator.isLength(description, { min: 5, max: 200 })) {
    throw new InvalidInputError("Invalid description");
  }
  if (pay <= 0) {
    throw new InvalidInputError("Invalid pay");
  }
  if (estimatedTimeInMins <= 0) {
    throw new InvalidInputError("Invalid estimated time");
  }
  return true;
}
export { isValid };
