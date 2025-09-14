
import redisClient from "../config/redisClient.js";
import { validate } from "../utils/validator.js";
import { generateETag } from "../utils/etagGenerator.js";
import { flattenKeys, unflattenKeys, deleteAllKeys } from "../utils/flattenUtils.js";
import { publishPlanChange } from "../utils/planPublisher.js";

const setDefaultHeaders = (res) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": "application/json",
  });
};

// Create
export const createPlan = async (req, res) => {
  const planData = req.body;

  if (!validate(planData)) {
    return res.status(400).json({ error: "Invalid data", details: validate.errors });
  }

  try {
    const existing = await redisClient.get(planData.objectId);
    if (existing) {
      return res.status(409).json({ error: "Conflict: Plan already exists" });
    }

    const etag = generateETag(planData);
    await redisClient.set(planData.objectId, JSON.stringify({ plan: planData, etag }));
    await flattenKeys(planData);
    publishPlanChange("STORE", planData);

    console.log("[CREATE] Stored ETag:", etag);
    setDefaultHeaders(res);
    res.setHeader("ETag", etag);
    res.status(201).json({ message: "Plan created successfully", objectId: planData.objectId });
  } catch (err) {
    console.error("Error creating plan:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Read
export const getPlan = async (req, res) => {
  setDefaultHeaders(res);
  try {
    const objectId = req.params.objectId;
    const raw = await redisClient.get(objectId);
    if (!raw) return res.status(404).json({ error: "Plan not found" });

    const { plan, etag } = JSON.parse(raw);

    console.log("[GET] Stored ETag:", etag);
    console.log("[GET] If-None-Match Header:", req.headers["if-none-match"]);

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).send();
    }

    res.setHeader("ETag", etag);
    res.status(200).json(plan);
  } catch (err) {
    console.error("Error fetching plan:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Patch
export const patchPlan = async (req, res) => {
  try {
    const { objectId } = req.params;
    const patchData = req.body;

    // Step 1: Get stored plan + ETag
    const raw = await redisClient.get(objectId);
    if (!raw) return res.status(404).json({ error: "Plan not found" });

    const { plan: existingPlan, etag: currentEtag } = JSON.parse(raw);

    // Step 2: Extract and clean If-Match header
    const ifMatchHeader = req.headers["if-match"]?.replace(/"/g, "");

    console.log("[PATCH] ObjectId:", objectId);
    console.log("[PATCH] Stored ETag:", currentEtag);
    console.log("[PATCH] If-Match Header:", ifMatchHeader);

    // Step 3: Enforce If-Match header presence
    if (!ifMatchHeader) {
      return res.status(428).json({ error: "Precondition Required: Missing If-Match header" });
    }

    // Step 4: Compare ETags
    if (ifMatchHeader !== currentEtag) {
      return res.status(412).json({ error: "Precondition Failed: ETag mismatch" });
    }

    // Step 5: Merge, validate, and save
    const mergedPlan = deepMerge(existingPlan, patchData);

    if (!validate(mergedPlan)) {
      return res.status(400).json({ error: "Invalid data", details: validate.errors });
    }

    const newEtag = generateETag(mergedPlan);
    await redisClient.set(objectId, JSON.stringify({ plan: mergedPlan, etag: newEtag }));
    await flattenKeys(mergedPlan);
    publishPlanChange("STORE", mergedPlan);

    console.log("[PATCH] New ETag after merge:", newEtag);

    res.setHeader("ETag", newEtag);
    res.status(200).json(mergedPlan);
  } catch (err) {
    console.error("Error updating plan:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  (PUT)
export const updatePlan = async (req, res) => {
  try {
    const { objectId } = req.params;
    const updatedPlan = req.body;

    // Validate the body
    if (!updatedPlan || !updatedPlan.objectId || !validate(updatedPlan)) {
      return res.status(400).json({ error: "Bad Request: Invalid data" });
    }

    const raw = await redisClient.get(objectId);
    if (!raw) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const { etag: existingEtag } = JSON.parse(raw);
    const ifMatchHeader = req.headers["if-match"]?.replace(/"/g, "");

    console.log("[PUT] Stored ETag:", existingEtag);
    console.log("[PUT] If-Match Header:", ifMatchHeader);

    if (!ifMatchHeader) {
      return res.status(428).json({ error: "Precondition Required: Missing If-Match header" });
    }

    if (ifMatchHeader !== existingEtag) {
      return res.status(412).json({ error: "Precondition Failed: ETag mismatch" });
    }

    // Generate new ETag
    const newEtag = generateETag(updatedPlan);

    await redisClient.set(objectId, JSON.stringify({ plan: updatedPlan, etag: newEtag }));
    await flattenKeys(updatedPlan);
    publishPlanChange("STORE", updatedPlan);

    res.setHeader("ETag", newEtag);
    return res.status(200).json(updatedPlan);
  } catch (err) {
    console.error("Error replacing plan:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};





// export const deletePlan = async (req, res) => {
//   setDefaultHeaders(res);
//   try {
//     const objectId = req.params.objectId;

//     // Get the root plan from Redis
//     const raw = await redisClient.get(objectId);
//     if (!raw) return res.status(404).json({ error: "Plan not found" });

//     const { plan: fullPlan } = JSON.parse(raw);

//     // Safely delete all keys prefixed with this plan's objectId
//     await deleteAllKeys(objectId);

//     // Also delete the main key storing the full plan
//     await redisClient.del(objectId);

//     // Notify Elasticsearch via RabbitMQ or any pub/sub mechanism
//     publishPlanChange("DELETE", fullPlan);

//     return res.status(204).send();
//   } catch (err) {
//     console.error("Error deleting plan:", err);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

export const deletePlan = async (req, res) => {
  setDefaultHeaders(res);
  try {
    const objectId = req.params.objectId;

    // Get the root plan from Redis
    const raw = await redisClient.get(objectId);
    if (!raw) return res.status(404).json({ error: "Plan not found" });

    const { plan: fullPlan } = JSON.parse(raw);

    // Safely delete all Redis keys associated with the plan
    await deleteAllKeys(objectId);

    // Delete the main key
    await redisClient.del(objectId);

    //  NEW: Prevent duplicate RabbitMQ DELETE
    if (fullPlan?.objectType === "plan") {
      publishPlanChange("DELETE", fullPlan); // Only publish once here
    }

    return res.status(204).send();
  } catch (err) {
    console.error("Error deleting plan:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// Deep Merge
const deepMerge = (target, source) => {
  for (const key in source) {
    if (Array.isArray(source[key])) {
      target[key] = mergeArrays(target[key] || [], source[key]);
    } else if (typeof source[key] === "object") {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

const mergeArrays = (existingArray, newArray) => {
  const result = [...existingArray];
  newArray.forEach((newItem) => {
    const index = result.findIndex((item) => item.objectId === newItem.objectId);
    if (index !== -1) {
      result[index] = deepMerge(result[index], newItem);
    } else {
      result.push(newItem);
    }
  });
  return result;
};
