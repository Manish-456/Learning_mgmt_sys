import express from 'express';
import { createOrder, getAllOrders } from '../controllers/order.controller';
import { authorizedRole, isAuthenticated } from '../middleware/auth';
const orderRouter = express.Router();

orderRouter.post('/create-order', isAuthenticated ,createOrder);
orderRouter.get('/get-orders', isAuthenticated, authorizedRole("Admin"), getAllOrders)

export default orderRouter;