import { client } from './elasticServiceConnection.js';

const INDEX_NAME = "planindex";

let mapOfDocuments = {};
let listOfKeys = [];

// Utility: Build Elasticsearch ID key as `${parentId}:${childId}`
const buildKey = (parentId, objectId) => `${parentId}:${objectId}`;

// Recursive function to build documents for indexing
const convertMapToDocumentIndex = async (jsonObject, parentId, objectName, rootPlanId) => {
  const valueMap = {};
  const map = {};

  if (!jsonObject || typeof jsonObject !== "object") return {};

  for (const [key, value] of Object.entries(jsonObject)) {
    if (Array.isArray(value)) {
      await convertToList(value, jsonObject.objectId, key, rootPlanId);
    } else if (typeof value === 'object') {
      await convertMapToDocumentIndex(value, jsonObject.objectId, key, rootPlanId);
    } else {
      valueMap[key] = value;
      map[buildKey(parentId, jsonObject.objectId)] = valueMap;
    }
  }

  if (objectName === "plan") {
    valueMap["plan_join"] = { parent: "", name: objectName };
  } else if (objectName.match(/^-?\d+$/)) {
    parentId = rootPlanId;
    valueMap["plan_join"] = { parent: rootPlanId, name: "linkedPlanServices" };
  } else {
    valueMap["plan_join"] = { name: objectName, parent: parentId };
  }

  const id = buildKey(parentId, jsonObject.objectId);
  if (jsonObject?.objectId) mapOfDocuments[id] = valueMap;

  return map;
};

const convertToList = async (array, parentId, key, rootPlanId) => {
  for (let item of array) {
    if (Array.isArray(item)) {
      await convertToList(item, parentId, key, rootPlanId);
    } else if (typeof item === "object") {
      await convertMapToDocumentIndex(item, parentId, key, rootPlanId);
    }
  }
};

// Recursive function to gather keys to delete
const convertToKeys = async (jsonObject, parentId) => {
  if (!jsonObject || typeof jsonObject !== "object") return;

  for (const [key, value] of Object.entries(jsonObject)) {
    if (Array.isArray(value)) {
      for (let item of value) {
        await convertToKeys(item, jsonObject.objectId);
      }
    } else if (typeof value === "object") {
      await convertToKeys(value, jsonObject.objectId);
    }
  }

  if (jsonObject.objectId) {
    const id = buildKey(parentId, jsonObject.objectId);
    listOfKeys.push(id);
  }
};

// POST: Index plan and all its children
export const postDocument = async (plan) => {
  try {
    mapOfDocuments = {};
    await convertMapToDocumentIndex(plan, "", "plan", plan.objectId);

    for (const [key, value] of Object.entries(mapOfDocuments)) {
      const [parentId, objectId] = key.split(":");
      await client.index({
        index: INDEX_NAME,
        id: objectId,
        routing: parentId,
        body: value,
      });
    }

    return { message: 'Document has been posted', status: 200 };
  } catch (e) {
    console.error("Error posting document:", e);
    return { message: 'Document has not been posted', status: 500 };
  }
};

// DELETE: Remove all documents belonging to this plan
export const deleteDocument = async (planObject) => {
  if (!planObject || typeof planObject !== "object") {
    console.error("deleteDocument() received invalid input:", planObject);
    return { message: "Invalid document to delete", status: 400 };
  }

  listOfKeys = [];
  await convertToKeys(planObject, "");

  for (const key of listOfKeys) {
    const [parentId, objectId] = key.split(":");
    await client.delete({
      index: INDEX_NAME,
      id: objectId,
      routing: parentId,
    }).catch(err => {
      console.error("Elasticsearch delete error:", err.meta?.body?.error || err.message);
    });
  }

  return { message: 'Document has been deleted', status: 200 };
};
