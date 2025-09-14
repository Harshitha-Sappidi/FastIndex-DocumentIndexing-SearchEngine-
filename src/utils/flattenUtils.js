import redisClient from "../config/redisClient.js";

// Recursively flattens nested objects and stores them in Redis
export const flattenKeys = async (data) => {
  const parentKey = `${data.objectType}:${data.objectId}`;
  let newObj = {};

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const newKey = `${parentKey}:${key}`;
      const res = await flattenKeys(value);
      await redisClient.set(newKey, JSON.stringify(res));
      newObj[key] = newKey;
    } else if (Array.isArray(value)) {
      const arr = [];
      for (let i = 0; i < value.length; i++) {
        arr.push(await flattenKeys(value[i]));
      }
      const newKey = `${parentKey}:${key}`;
      await redisClient.set(newKey, JSON.stringify(arr));
      newObj[key] = newKey;
    } else {
      newObj[key] = value;
    }
  }

  await redisClient.set(parentKey, JSON.stringify(newObj));
  return parentKey;
};

// Recursively reconstructs nested objects from Redis-flattened structure
export const unflattenKeys = async (parentKey) => {
  const raw = await redisClient.get(parentKey);
  if (!raw) return null;

  const data = JSON.parse(raw);
  if (typeof data !== "object" || Array.isArray(data)) return data;

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.includes(":")) {
      result[key] = await unflattenKeys(value);
    } else if (Array.isArray(value)) {
      const arr = [];
      for (const item of value) {
        arr.push(await unflattenKeys(item));
      }
      result[key] = arr;
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Safely deletes only the keys associated with a specific plan (by objectId)
export const deleteAllKeys = async (objectId) => {
  try {
    const keyPrefix = `plan:${objectId}`;
    const keysToDelete = await redisClient.keys(`${keyPrefix}*`);

    if (keysToDelete.length > 0) {
      await redisClient.del(keysToDelete);
      console.log(`[SAFE DELETE] Deleted keys: ${keysToDelete.join(", ")}`);
    } else {
      console.log(`[SAFE DELETE] No keys found for: ${keyPrefix}*`);
    }
  } catch (err) {
    console.error("Error during safe key deletion:", err);
    throw err;
  }
};
