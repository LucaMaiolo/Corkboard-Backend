import Express, { type Request, type Response } from "express";
import * as offerModel from "../models/offerModelMongoDb.js";
import type { OfferCreateInput } from "../models/offerModelMongoDb.js";
import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";

const router = Express.Router();
const routeRoot = "/offers";

/**
 * creates a new offer on a gig. replaces any existing offer from the same user on the same gig.
 * @param request - request.body contains the offer fields (gigId, submittedById, listerId, price, message)
 * @param response - 201 with the created offer on success, 400 on invalid input, 500 on db/unexpected error
 */
const addOffer = async (request: Request<Record<string, never>, unknown, OfferCreateInput>, response: Response): Promise<void> => {
  try {
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
 * retrieves all offers for a given gig.
 * @param request - request.query.gigId is the uuid of the gig
 * @param response - 200 with array of offers on success, 500 on db/unexpected error
 */
const getOffersByGig = async (request: Request<Record<string, never>, unknown, unknown, { gigId: string }>, response: Response): Promise<void> => {
  try {
    const { gigId } = request.query;
    const result = await offerModel.getOffersByGig(gigId);
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
router.get("/", getOffersByGig);

/**
 * accepts an offer and declines all other pending offers on the same gig.
 * @param request - request.params.id is the uuid of the offer to accept
 * @param response - 200 with the gigId on success, 500 on db/unexpected error
 */
const acceptOffer = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
  try {
    const { id } = request.params;
    const result = await offerModel.acceptOffer(id);
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
