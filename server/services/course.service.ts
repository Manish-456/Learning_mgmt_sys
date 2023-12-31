import { Response } from 'express';
import CourseModel from '../models/course.model';
import { CatchAsyncError } from '../middleware/catch-async-error';


// create course
export const createCourse = CatchAsyncError(async (data: any, res: Response) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
        success: true,
        course
    })
})

// get All Courses
export const getAllCoursesServices = async (
    res: Response) => {
    const courses = await CourseModel.find();
    res.status(201).json({
        success: true,
        courses
    })
}

