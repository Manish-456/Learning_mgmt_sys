
import {  Response } from "express";
import { CatchAsyncError } from "../middleware/catch-async-error";
import OrderModel from "../models/orderModel";

// create new order
export const newOrder = CatchAsyncError(async(order : any, res: Response) => {
  const newOrder = await OrderModel.create(order);
  res.status(201).json({
    success: true,
    order: newOrder
})
})