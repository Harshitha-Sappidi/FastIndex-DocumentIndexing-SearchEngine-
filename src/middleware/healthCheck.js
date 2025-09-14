import redisClient from "../config/redisClient.js";

const redisConnection = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

const healthCheck = async (req, res, next) => {
  try {
    await redisConnection();
    next();
  } catch (err) {
    res.status(500).json({ error: "Redis connection failed", details: err.message });
  }
};

export default healthCheck;
