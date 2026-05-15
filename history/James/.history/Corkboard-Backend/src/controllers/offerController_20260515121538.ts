import Express, { type Request, type Response } from "express";
import * as offerModel from "../models/offerModelMongoDb.js";
import type { OfferCreateInput } from "../models/offerModelMongoDb.js";
import * as taskModel from "../models/taskModelMongoDb.js";
import type { Status } from "../models/taskModelMongoDb.js";
import { ObjectId } from "mongodb";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";
import { authenticateUser } from "./sessionController.js";

const router = Express.Router();
const routeRoot = "/offers";

/**
 * creates a new offer on a gig. replaces any existing offer from the same user on the same gig.
 * @param request - request.body contains the offer fields (gigId, submittedById, listerId, price, message)
 * @param response - 201 with the created offer on success, 400 on invalid input, 500 on db/unexpected error
 */
const addOffer = async (request: Request<Record<string, never>, unknown, OfferCreateInput>, response: Response): Promise<void> => {
  try {
    let taskId: ObjectId;
    try {
      taskId = new ObjectId(request.body.gigId);
    } catch {
      response.status(400).send("Invalid gigId");
      return;
    }
    const task = await taskModel.getTaskById(taskId);
    if (task === null) {
      response.status(404).send("Gig not found");
      return;
    }
    if (request.body.price > task.pay) {
      response.status(400).send(`Offer price cannot exceed the gig budget of ${task.pay}`);
      return;
    }
    const result = await offerModel.addOffer(request.body);
    response.status(201).json(result);
  } catch (error) {
    if (error instanceof InvalidInputError) {
      response.status(400).send(`Invalid input: ${error.message}`);
    } else if (error instanceof DatabaseError) {
      response.status(500).send(`Database error: ${error.message}`);
    } else if (error instanceof Error) {
      response.status(500).send(`Unexpected error: ${error.message}`);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
};
router.post("/", addOffer);

/**
 * retrieves offers for a given gig. admins and the task owner see all offers; submitters see only their own.
 * @param request - request.query.gigId is the ObjectId of the gig; requires a valid session cookie
 * @param response - 200 with array of offers, 401 if not authenticated, 403 if unauthorized, 404 if gig not found, 500 on error
 */
const getOffersByGig = async (request: Request<Record<string, never>, unknown, unknown, { gigId: string }>, response: Response): Promise<void> => {
  const auth = authenticateUser(request);
  if (auth === null) {
    response.status(401).send("Unauthorized");
    return;
  }
  const { gigId } = request.query;
  let taskId: ObjectId;
  try {
    taskId = new ObjectId(gigId);
  } catch {
    response.status(400).send("Invalid gigId");
    return;
  }
  try {
    const task = await taskModel.getTaskById(taskId);
    if (task === null) {
      response.status(404).send("Gig not found");
      return;
    }
    const isOwner = task.listerId === auth.userSession.username;
    if (auth.userSession.isAdmin || isOwner) {
      response.status(200).json(await offerModel.getOffersByGig(gigId));
      return;
    }
    const myOffers = (await offerModel.getOffersByGig(gigId)).filter(
      (offer) => offer.submittedById === auth.userSession.username
    );
    if (myOffers.length === 0) {
      response.status(403).send("Forbidden");
      return;
    }
    response.status(200).json(myOffers);
  } catch (error) {
    if (error instanceof DatabaseError) {
      response.status(500).send(`Database error: ${error.message}`);
    } else if (error instanceof Error) {
      response.status(500).send(`Unexpected error: ${error.message}`);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
};
router.get("/", getOffersByGig);

/**
 * retrieves all offers submitted by the currently logged-in user.
 * @param request - session cookie identifies the user
 * @param response - 200 with array of offers, 401 if not logged in, 500 on error
 */
const getMyOffers = async (request: Request, response: Response): Promise<void> => {
  const auth = authenticateUser(request);
  if (auth === null) {
    response.status(401).send("Unauthorized");
    return;
  }
  try {
    const result = await offerModel.getOffersByUser(auth.userSession.username);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof DatabaseError) {
      response.status(500).send(`Database error: ${error.message}`);
    } else if (error instanceof Error) {
      response.status(500).send(`Unexpected error: ${error.message}`);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
};
router.get("/myOffers", getMyOffers);

/**
 * accepts an offer and declines all other pending offers on the same gig.
 * @param request - request.params.id is the uuid of the offer to accept
 * @param response - 200 with the gigId on success, 500 on db/unexpected error
 */
const acceptOffer = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
  try {
    const { id } = request.params;
    const result = await offerModel.acceptOffer(id);
    const task = await taskModel.getTaskById(new ObjectId(result.gigId));
    await taskModel.updateTask(new ObjectId(result.gigId), {
      name: task.name,
      description: task.description,
      location: task.location,
      pay: task.pay,
      timeInMins: task.timeInMins,
      status: "Completed" as Status,
    });
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof DatabaseError) {
      response.status(500).send(`Database error: ${error.message}`);
    } else if (error instanceof Error) {
      response.status(500).send(`Unexpected error: ${error.message}`);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
};
router.put("/:id/accept", acceptOffer);

/**
 * declines a single pending offer.
 * @param request - request.params.id is the uuid of the offer to decline
 * @param response - 200 on success, 500 on db/unexpected error
 */
const declineOffer = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
  try {
    const { id } = request.params;
    await offerModel.declineOffer(id);
    response.status(200).send("Offer declined");
  } catch (error) {
    if (error instanceof DatabaseError) {
      response.status(500).send(`Database error: ${error.message}`);
    } else if (error instanceof Error) {
      response.status(500).send(`Unexpected error: ${error.message}`);
    } else {
      response.status(500).send("Unexpected error occurred");
    }
  }
};
router.put("/:id/decline", declineOffer);

export { router, routeRoot };
