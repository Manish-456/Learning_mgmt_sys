import express from "express";
import { 
    activateUser,
     getUserInfo,
      loginUser,
       logoutUser,
        registration,
         socialAuth,
          updateAccessToken,
           updateUserInfo,
            updateUserPassword } from "../controllers/user.controller";

import { authorizedRole, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post('/registration', registration);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser)

userRouter.post('/social-auth', socialAuth);

userRouter.get('/logout', isAuthenticated, authorizedRole("Admin"), logoutUser)

userRouter.get('/refreshtoken', updateAccessToken);

userRouter.get('/me', isAuthenticated, getUserInfo)

userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);

userRouter.put('/update-user-password', isAuthenticated, updateUserPassword);

export default userRouter;