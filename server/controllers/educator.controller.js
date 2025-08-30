import {clerkClient} from '@clerk/express'
import Course from '../models/Course.model.js'
import {v2 as cloudinary} from 'cloudinary'
import { Purchase } from '../models/Purchase.model.js';
import User from '../models/User.model.js'


//update role to educator
export const updateRoleToEducator = async (req, res)=> {
    try {
        const { userId } = req.auth();

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'educator',
            }
        })

        res.json({success: true, message: 'You can publish a course now'})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

//add new course
export const addCourse = async (req, res)=> {
    try {
        const { courseData } = req.body
        const imageFile = req.file
        const { userId: educatorId } = req.auth();

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached'})
        }

        const parsedCourseData = await JSON.parse(courseData)
        parsedCourseData.educator = educatorId

        const newCourse = await Course.create(parsedCourseData)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path)
        newCourse.courseThumbnail = imageUpload.secure_url
        await newCourse.save()

        res.json({success: true, message: 'Course Added'})


    } catch (error) {
        res.json({ success: false, message: error.message})
    }
}


// Getr all educator courses

export const getEducatorCourses = async (req, res) => {
    try {


        const { userId } = req.auth();

        const courses = await Course.find({ educator: userId })

        res.json({success: true, courses})
        
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Get dashboard data total earning, students, courses

export const educatorDashboardData = async (req, res)=> {
    try {
        const { userId } = req.auth();

        const courses = await Course.find({ educator: userId })

        const totalCourses = courses.length

        const courseId = courses.map(course => course._id)

        //Total earning

        const purchases = await Purchase.find({
            courseId: {$in: courseId},
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)

        //Student IDs with course

        const enrolledStudentsData = []
        for (const course of courses){
            const students = await User.find({
                _id: {$in: course.enrolledStudents}
            }, 'name imageUrl')

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                })
            })
        }

        res.json({success: true, dashboardData: {
            totalEarnings, enrolledStudentsData, totalCourses
        }})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


//Get enrolled stdents data with purchase

export const getEnrolledStudentsData = async (req, res) => {
    try {
        const { userId } = req.auth();
        const courses = await Course.find({ educator: userId })
        const courseId = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: {$in: courseId},
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId, 
            courseTitle: purchase.courseId.courseTitle,
            purchaseData: purchase.createdAt
        }))

        res.json({success: true, enrolledStudents})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}