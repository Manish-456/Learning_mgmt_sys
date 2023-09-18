import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

import userModel, { IUser } from '../models/user.model';
import { CatchAsyncError } from '../middleware/catch-async-error';
import ErrorHandler from '../utils/error-handler';
import sendMail from '../utils/sendMail';
import { sendToken } from '../utils/jwt';

interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registration = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) return next(new ErrorHandler(400, "Email already exists"));

        const user: IRegistrationBody = {
            name,
            email,
            password
        };

        const activationCode = createActivationToken(user);

        const data = { user: { name: user.name }, activationCode };

        // ? Send mail to the user
        try {
            await sendMail({ subject: "Activate your account", template: "activation-mail.ejs", data, email })
            res.status(201).json({ success: true, message: `Please check your email: ${user.email} to activate your account`, activationToken: activationCode.token });

        } catch (err) {
            return next(new ErrorHandler(500, `Something went wrong ${err}`))
        }

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
})

interface IActivationToken {
    token: string;
    activationCode: string
}
export const createActivationToken = (user: IRegistrationBody): IActivationToken => {

    const activationCode = Math.floor(1000 * Math.random() * 9000).toString();
    const token = jwt.sign({
        user, activationCode
    }, process.env.ACTIVATION_SECRET as Secret, {
            expiresIn: '5m'
        });
    return {
        token,
        activationCode
    }
}

// Activate User
interface IUserActivation {
    activation_token: string;
    activation_code: string;
}

export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IUserActivation;
        const newUser: { user: IUser; activationCode: string } = jwt.verify(activation_token,
            process.env.ACTIVATION_SECRET as Secret
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) return next(new ErrorHandler(400, "Invalid activation code"));
        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email });
        if (existUser) return next(new ErrorHandler(400, "Email already exists."));

        const user = await userModel.create({
            name,
            email,
            password
        });

        await user.save();

        return res.status(201).json({
            success: true
        });

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// login user

interface ILoginRequest {
    email: string;
    password: string;
}

export const login = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;
       

        if (!email || !password) return next(new ErrorHandler(401, "Please enter email and password"));
        const user = await userModel.findOne({ email });
          
        if (!user) return next(new ErrorHandler(401, "Invalid email or password"));

        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) return next(new ErrorHandler(400, "Invalid credentials"))

        sendToken(user, 200, res);
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
})

