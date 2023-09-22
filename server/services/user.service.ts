import { Response } from "express";
import { redis } from "../utils/redis";
import userModel from "../models/user.model";

export const getUserById = async (id: string, res: Response) => {
    const user = await redis.get(id);
    res.status(200).json({
        success: true,
        user: JSON.parse(user as string)
    });
}

export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({
        createdAt: -1
    });

    res.json({
        success: true,
        users
    })

}

export const updateUserRoleService = async (id: string, role: string, res: Response) => {

    const user = await userModel.findByIdAndUpdate(id, {
        $set: {
            role
        }
    }, {
        new : true
    });

    res.json({
        success: true,
        user
    })


}