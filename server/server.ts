import { app } from "./app";
import dotenv from 'dotenv';
import connectDB from "./utils/db";
dotenv.config();

const port = process.env.PORT || 5000;

// create server
app.listen(port, () => {
    connectDB();
    console.log(`Server is running at port ${port}`);
})

