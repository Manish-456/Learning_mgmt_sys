import express from 'express';
import { authorizedRole, isAuthenticated } from '../middleware/auth';
import { createLayout, editLayout, getLayoutByType } from '../controllers/layout.controller';
const layoutRouter = express.Router()

layoutRouter.get('/get-layout', getLayoutByType);
layoutRouter.post('/create-layout', isAuthenticated, authorizedRole("Admin"), createLayout)
layoutRouter.put('/edit-layout', isAuthenticated, authorizedRole("Admin"), editLayout)

export default layoutRouter;