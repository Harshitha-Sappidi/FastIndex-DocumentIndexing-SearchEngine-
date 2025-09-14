// src/utils/planPublisher.js
import { producer } from "../services/rabbitmq.service.js";

export const publishPlanChange = async (operation, body) => {
  const message = { operation, body };
  producer(message);
};