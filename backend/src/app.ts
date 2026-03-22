import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'EventPass API is running' });
});

const PORT = process.env.PORT || 5000;

import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import registrationRoutes from './routes/registrationRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Use error handler middleware
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
