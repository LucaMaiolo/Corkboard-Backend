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
function isValidTask(
  id: string,
  name: string,
  description: string,
  location: string,
  pay: number,
  TimeInMins: number,
  status: Status,
) {
  if(!id || !validator.isUUID(id)){
    
  }

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


function isValidUser(
  username: string,
    password: string,
    email: string,
    birthday: Date,
){
  if(!username || !validator.isAlphanumeric(username) || !validator.isLength(username, {min: 3, max: 16}) ){
    throw new InvalidInputError("Invalid username");
  }
  if (!password || !validator.isLength(password, {min: 8})){
    throw new InvalidInputError("Invalid password");
  }
  if (!email || !validator.isEmail(email)){
    throw new InvalidInputError("Invalid email");
  }
  if (!birthday || !validator.isDate(birthday.toISOString())){
    throw new InvalidInputError("Invalid birthday");
  }

  let today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDifference = today.getMonth() - birthday.getMonth();
  if (monthDifference <0 || (monthDifference === 0 && today.getDate() < birthday.getDate())){
    age--;
  }
  if (age < 18){
    throw new InvalidInputError("User must be at least 18 years old");
  }

  return true;
  
}



export { isValidTask,isValidUser };
