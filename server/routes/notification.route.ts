import express from 'express';
import { getNotifications, updateNotificationStatus } from '../controllers/notification.controller';
import { authorizedRole, isAuthenticated } from '../middleware/auth';
const notificationRouter = express.Router();

notificationRouter.get('/notifications', isAuthenticated, authorizedRole("Admin"), getNotifications)
notificationRouter.put('/update-notification/:id', isAuthenticated, authorizedRole("Admin"), updateNotificationStatus)

export default notificationRouter;