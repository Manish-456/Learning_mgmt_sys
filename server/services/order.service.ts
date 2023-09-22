
import {  Response } from "express";
import { CatchAsyncError } from "../middleware/catch-async-error";
import OrderModel from '../models/orderModel';

// create new order
export const newOrder = CatchAsyncError(async(order : any, res: Response) => {
  const newOrder = await OrderModel.create(order);
  res.status(201).json({
    success: true,
    order: newOrder
})
});

// get All Orders
export const getAllOrderServices = async (res: Response) => {
  const orders = await OrderModel.find().sort({
      createdAt: -1
  });

  res.json({
      success: true,
      orders
  })

}