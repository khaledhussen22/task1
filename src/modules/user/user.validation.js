import joi from "joi";
import { generalFields } from "../../middleware/validation.middelware.js";
export const sendRequest=joi.object({
    FID:generalFields.id.required(),

})