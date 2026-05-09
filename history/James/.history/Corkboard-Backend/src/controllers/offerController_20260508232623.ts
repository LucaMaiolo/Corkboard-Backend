import Express, { type Request, type Response } from "express";
import * as offerModel from "../models/offerModelMongoDb.js";
import type { OfferCreateInput } from "../models/offerModelMongoDb.js";

import { DatabaseError } from "../models/DatabaseError.js";
import { InvalidInputError } from "../models/InvalidInputError.js";

const router = Express.Router();
const routeRoot = "/offers";

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

export { router, routeRoot };
