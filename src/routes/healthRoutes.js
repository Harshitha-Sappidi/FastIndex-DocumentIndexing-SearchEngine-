import express from 'express';
import healthCheck from '../middleware/healthCheck.js';


const router = express.Router();

router.get('/health', healthCheck, (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

export default router;
