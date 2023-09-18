import { Response } from "express";
import userModel from "../models/user.model"

export const getUserById = async(id : string, res : Response) => {
    console.log(id)
    const user = await userModel.findById(id).select("-password");
     res.status(200).json({
        success : true,
        user
    });
}