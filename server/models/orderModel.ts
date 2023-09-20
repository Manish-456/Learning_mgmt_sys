import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOrder extends Document {
    courseId: string;
    userId: string;
    payment_info: Record<string, any>;
}

const orderSchema: Schema<IOrder> = new mongoose.Schema({
    courseId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    payment_info: {
        type: Object
    }
}, { timestamps: true });

const OrderModel: Model<IOrder> = mongoose.model("Order", orderSchema);

export default OrderModel;



