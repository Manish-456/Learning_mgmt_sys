import mongoose, { Document, Model, Schema } from "mongoose";

interface IComment extends Document {
    user: Record<string, any>;
    comment: string;
    commentReplies?: IComment[]
}

interface IReview extends Document {
    user: Record<string, any>;
    rating: number;
    comment: string;
    commentReplies: IComment[];
}

interface ILink extends Document {
    title: string;
    url: string;
}

interface ICourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: Record<string, any>;
    videoSection: string;
    duration: number;
    videoPlayer: string;
    links: ILink[];
    suggestion: string;
    questions: IComment[];
}

interface ICourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: Record<string, any>;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    reviews: IReview[];
    courseData: ICourseData[];
    ratings?: number;
    purchased?: number;
}

const reviewSchema: Schema<IReview> = new mongoose.Schema({
    user: Object,
    rating: {
        type: Number,
        required: true
    },
    comment: String
})

const linkSchema: Schema<ILink> = new mongoose.Schema({
    title: String,
    url: String
});

const commentSchema: Schema<IComment> = new mongoose.Schema({
    user: Object,
    comment: String,
    commentReplies: [Object]
})

const courseDataSchema = new mongoose.Schema({
    videoUrl: String,
    videoThumbnail: String,
    title: String,
    videoSection: String,
    description: String,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [commentSchema],
    videoLength: Number
});

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    estimatedPrice: Number,

    thumbnail: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },

    tags: {
        type: String,
        required: true
    },

    level: {
        type: String,
        required: true
    },

    demoUrl: {
        type: String,
        required: true
    },

    benefits: [{
        title: String
    }],

    prerequisites: [{
        title: String
    }],

    reviews: [reviewSchema],

    courseData: [courseDataSchema],

    ratings: {
        type: Number,
        default: 0
    },

    purchased: {
        type: Number,
        default: 0
    }
})

const CourseModel = mongoose.model("Course", courseSchema);
export default CourseModel;


