import dotenv from 'dotenv';
dotenv.config();
import { Request, Response, NextFunction } from 'express';
import type { IUser } from '../models/user.model';
import userModel from '../models/user.model';
import ErrorHandler from '../utils/error-handler';
import { CatchAsyncError } from '../middleware/catch-async-error';
import jwt, { Secret } from 'jsonwebtoken';
import ejs from 'ejs';
import path from 'path';

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

        const activationCode = createActivationToken({email, name});
        console.log(activationCode);

        const data = {user : {name : user.name}, activationCode};

        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);
        // ! todo add more code here.


    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
})

interface IActivationToken {
    token: string;
    activationCode: string
}
export const createActivationToken = (user: Omit<IRegistrationBody, 'password'>): IActivationToken => {

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

