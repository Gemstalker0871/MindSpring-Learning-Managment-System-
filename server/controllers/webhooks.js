import { Webhook } from "svix";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.model.js";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";

// -----------------------
// Clerk Webhook Handler
// -----------------------
export const clerWebHooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.Clerk_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url
        };
        await User.create(userData);
        res.json({});
        break;
      }
      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url
        };
        await User.findByIdAndUpdate(data.id, userData);
        res.json({});
        break;
      }
      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        res.json({});
        break;
      }
      default:
        console.log(`Unhandled Clerk event type: ${type}`);
        res.json({});
    }
  } catch (error) {
    console.log("Clerk webhook error:", error);
    res.json({ success: false, message: error.message });
  }
};

// -----------------------
// Stripe Webhook Handler
// -----------------------
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  console.log("Stripe webhook hit!");
  console.log("Headers:", req.headers);

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Use the stripeInstance to construct the event
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("Stripe event type:", event.type);
  } catch (err) {
    console.log("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const purchaseId = session.metadata.purchaseId;

        if (!purchaseId) {
          console.log("No purchaseId found in session metadata!");
          break;
        }

        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.log("Purchase not found for ID:", purchaseId);
          break;
        }

        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId);

        if (!userData || !courseData) {
          console.log("User or Course not found!");
          break;
        }

        // Add IDs only, avoid duplicates
        if (!courseData.enrolledStudents.includes(userData._id)) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
          console.log("Course updated:", courseData._id);
        }

        if (!userData.enrolledCourses.includes(courseData._id)) {
          userData.enrolledCourses.push(courseData._id);
          await userData.save();
          console.log("User updated:", userData._id);
        }

        purchaseData.status = "completed";
        await purchaseData.save();
        console.log("Purchase updated:", purchaseData._id);

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const purchaseId = paymentIntent.metadata?.purchaseId;

        if (!purchaseId) {
          console.log("No purchaseId found in payment intent metadata!");
          break;
        }

        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.log("Purchase not found for ID:", purchaseId);
          break;
        }

        purchaseData.status = "failed";
        await purchaseData.save();
        console.log("Purchase marked as failed:", purchaseData._id);

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err) {
    console.log("Error processing Stripe webhook:", err);
    return res.status(500).send("Internal Server Error");
  }

  // Respond to Stripe
  res.json({ received: true });
};