import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaPath = path.resolve("./src/schemas/planSchema.json");
const planSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
export const validate = ajv.compile(planSchema);
