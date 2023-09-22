import express from 'express';
import { authorizedRole, isAuthenticated } from '../middleware/auth';
import { getCoursesAnalytics, getOrderAnalytics, getUserAnalytics } from '../controllers/analytics.controller';
const analyticsRouter = express.Router()

analyticsRouter.get('/get-users-analytics', isAuthenticated, authorizedRole("Admin"), getUserAnalytics)
analyticsRouter.get('/get-courses-analytics', isAuthenticated, authorizedRole("Admin"), getCoursesAnalytics)
analyticsRouter.get('/get-orders-analytics', isAuthenticated, authorizedRole("Admin"), getOrderAnalytics)
export default analyticsRouter;