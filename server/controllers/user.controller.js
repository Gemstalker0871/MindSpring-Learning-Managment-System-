import Stripe from "stripe";
import Course from "../models/Course.model.js";
import { Purchase } from "../models/Purchase.model.js";
import User from "../models/User.model.js";


//get user data

export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth();

        const user = await User.findById(userId)

        if(!user){
            return res.json({success: false, message: 'User Not Found' })
        }

        res.json ({success: true, user})

    } catch (error) {
        res.json({success: false, message: error.message })
    }
}


//User enrolled courses

export const userEnrolledCourses = async (req, res) => {
    try {
        const { userId } = req.auth();

        const userData = await User.findById(userId).populate('enrolledCourses')

        res.json ({success: true, enrolledCourses: userData.enrolledCourses})
        
    } catch (error) {
        res.json({success: false, message: error.message })
    }
}


//purchase

export const purchaseCourse = async(req, res) => {
    try {
        const { courseId } = req.body
        const { origin } = req.headers
        const { userId } = req.auth();
        const userData = await User.findById(userId);
        const courseData = await Course.findById(courseId)

        if(!userData || !courseData){
            return res.json({success: false, message: 'Data not found' })
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2)
        }

        const newPurchase = await Purchase.create(purchaseData)


        //Stripe innitialize

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
        const currency = process.env.CURRENCY.toLowerCase()

        //Creating line items

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle,
                },
                unit_amount: Math.floor(newPurchase.amount) *100
            },
            quantity: 1
        }]
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin.replace(/\/$/, '')}/loading/my-enrollments`,
            cancel_url: `${origin.replace(/\/$/, '')}/`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        })
        res.json({ success: true, session_url: session.url });
    } catch (error) {
        res.json({success: false, message: error.message })
    }
}