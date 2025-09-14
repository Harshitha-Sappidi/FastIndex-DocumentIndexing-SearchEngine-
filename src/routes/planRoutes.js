import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createPlan, getPlan, patchPlan, deletePlan } from '../controllers/planController.js';

const router = express.Router();

router.post('/v1/plans',verifyToken, createPlan);
router.get('/v1/plans/:objectId',verifyToken, getPlan);
router.patch('/v1/plans/:objectId',verifyToken, patchPlan);
router.delete('/v1/plans/:objectId',verifyToken, deletePlan);

export default router;
