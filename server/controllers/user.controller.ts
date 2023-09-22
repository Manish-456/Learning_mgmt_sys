import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';

import userModel, { IUser } from '../models/user.model';
import { CatchAsyncError } from '../middleware/catch-async-error';
import ErrorHandler from '../utils/error-handler';
import sendMail from '../utils/sendMail';
import { accessTokenOptions, refreshTokenOptions, sendToken } from '../utils/jwt';
import { redis } from '../utils/redis';
import { getAllUsersService, getUserById } from '../services/user.service';
import cloudinary from 'cloudinary';

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

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
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

export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access-token", "", { maxAge: 1 })
        res.cookie("refresh-token", "", { maxAge: 1 })

        redis.del(req.user._id);

        return res.status(200).json({
            success: true,
            message: "Logout successfully"
        });

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

export const updateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;

        const message = `Could not refresh token`;
        if (!decoded) return new ErrorHandler(400, message);

        const session = await redis.get(decoded.id);

        if (!session) return next(new ErrorHandler(400, message));

        const user = JSON.parse(session);

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {
            expiresIn: '5m'
        });

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
            expiresIn: '3d'
        })

        req.user = user;

        res.cookie('access_token', accessToken, accessTokenOptions)
        res.cookie('refresh_token', refreshToken, refreshTokenOptions)

        return res.status(200).json({
            status: "success",
            accessToken
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
}

export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user ?._id;
        getUserById(userId, res);
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
});

// Social auth

interface ISocialAuthBody {
    email: string;
    avatar: string;
    name: string;
}

export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });
        if (!user) {
            const newUser = await userModel.create({ email, name, avatar });
            newUser.save();
            sendToken(newUser, 200, res);
        } else {
            sendToken(user, 200, res);
        }
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))

    }
});

// update User Info

interface IUpdateUserInfo {
    name?: string;
    email?: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as IUpdateUserInfo;
        const userId = req.user._id;
        const user = await userModel.findById(userId).select("-password");

        if (email && user) {
            const isEmailExists = await userModel.findOne({ email });
            if (isEmailExists) return next(new ErrorHandler(400, 'Email already exists'));
            user.email = email;
        }

        if (name && user) {
            user.name = name;
        };

        await user ?.save();
        await redis.set(userId, JSON.stringify(user));


        return res.status(200).json({
            success: true,
            user
        })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message))
    }
})

// update user password
interface IUpdateUserPassword {
    oldPassword: string; // current password
    newPassword: string; // new password
}


export const updateUserPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdateUserPassword;
        if (!oldPassword || !newPassword) return next(new ErrorHandler(400, "Please enter old and new password"))
        const user = await userModel.findById(req.user._id);

        if (user ?.password === undefined) {
            return next(new ErrorHandler(400, "Invalid user"))
        }
        const isPasswordMatch = await user ?.comparePassword(oldPassword);

        if (!isPasswordMatch) return next(new ErrorHandler(400, 'Invalid '));

        user.password = newPassword;


        await user.save();
        await redis.set(req.user._id, JSON.stringify(user));
        return res.status(201).json({ success: true, user })
    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
});

// update profile picture

interface IUpdateUserAvatar {
    avatar: string;
}

export const updateUserAvatar = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body as IUpdateUserAvatar;
        const userId = req.user._id;
        const user = await userModel.findById(userId).select("-password");
        if (avatar && user) {

            if (user ?.avatar ?.public_id) {
                await cloudinary.v2.uploader.destroy(user ?.avatar ?.public_id);
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: 'avatars',
                    width: 150
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }

            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: 'avatars',
                    width: 150
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }
        }

        await user ?.save();
        await redis.set(userId, JSON.stringify(user));
        return res.status(200).json({ success: true, user });

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})

// Get all users
export const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        await getAllUsersService(res);

    } catch (error: any) {
        return next(new ErrorHandler(500, error.message));
    }
})