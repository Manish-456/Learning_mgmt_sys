import express from "express";
import { activateUser, login, registration } from "../controllers/user.controller";
const userRouter = express.Router();

userRouter.post('/registration', registration);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', login)

export default userRouter;