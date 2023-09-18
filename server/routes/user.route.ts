import express from "express";
import { activateUser, getUserInfo, loginUser, logoutUser, registration, socialAuth, updateAccessToken } from "../controllers/user.controller";
import { authorizedRole, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

userRouter.post('/registration', registration);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser)
userRouter.post('/social-auth', socialAuth);
userRouter.get('/logout', isAuthenticated, authorizedRole("Admin"), logoutUser)
userRouter.get('/refreshtoken', updateAccessToken)
userRouter.get('/me', isAuthenticated, getUserInfo)
export default userRouter;