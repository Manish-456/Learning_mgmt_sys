import express from 'express';
import { addQuestion, addAnswer , editCourse, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from '../controllers/course.controller';
import { authorizedRole, isAuthenticated } from '../middleware/auth';

const courseRouter = express.Router();

courseRouter.post('/upload-course', isAuthenticated, authorizedRole("Admin"), uploadCourse);
courseRouter.put('/edit-course/:id', isAuthenticated, authorizedRole("Admin"), editCourse);
courseRouter.get('/get-course/:id', getSingleCourse);
courseRouter.get('/get-courses', getAllCourses);
courseRouter.get('/get-course-content/:id', isAuthenticated, getCourseByUser);
courseRouter.put('/add-question', isAuthenticated, addQuestion);
courseRouter.put('/add-answer', isAuthenticated, addAnswer)

export default courseRouter