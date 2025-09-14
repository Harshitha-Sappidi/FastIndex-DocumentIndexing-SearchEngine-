import express from 'express';
import dotenv from 'dotenv';
import planRoutes from './src/routes/planRoutes.js';
import healthRoutes from './src/routes/healthRoutes.js';
import { elasticServiceConnection } from './src/services/elasticServiceConnection.js';
import { consumer } from './src/services/rabbitmq.service.js';

dotenv.config();

const app = express();
app.use(express.json());

// Load API routes
app.use('/api', planRoutes);
app.use('/api', healthRoutes); 

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test Elastic connection
    await elasticServiceConnection();

    // Start RabbitMQ consumer (important!)
    await consumer();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup Error:', err.message);
    process.exit(1);
  }
};

startServer();
