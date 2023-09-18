import dotenv from 'dotenv';
dotenv.config();
import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document {

    name: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    }
    role: string;
    isVerified: boolean;
    courses: { courseId: string }[];
    comparePassword: (password: string) => Promise<boolean>;
    signAccessToken : () => string;
    signRefreshToken : () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "please enter your name"],
    },
    email: {
        type: String,
        required: [true, "Please enter your email."],
        validate: {
            validator: function(value: string) {
                return emailRegexPattern.test(value);
            },
            message: "Please enter a valid email"
        },
        unique: true
    },
    password: {
        type: String,
        required: [true, "Please enter your password"],
        minlength: [6, "Password must be atleast 6 characters long"],

    },
    avatar: {
        public_id: String,
        url: String
    },
    role: {
        type: String,
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    courses: [{
        courseId: String
    }]
},
    {
        timestamps: true
    }
);

// hash Password before saving
userSchema.pre<IUser>('save', async function(next){
    if(!this.isModified('password')){
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next(); 
})

// compare password
userSchema.method('comparePassword', async function(enteredPassword : string) : Promise<boolean>{
    return await bcrypt.compare(enteredPassword, this.password);
  })

// sign Access Token
userSchema.methods.signAccessToken =  function() : string{

    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN as string)
}

//' Sign Refresh Token
userSchema.methods.signRefreshToken =  function() : string{
    return jwt.sign({ id : this._id }, process.env.REFRESH_TOKEN as string)
}

const userModel : Model<IUser> = mongoose.model("User", userSchema);
export default userModel;


