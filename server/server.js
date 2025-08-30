import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerWebHooks, stripeWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educator.routes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/course.routes.js'
import userRouter from './routes/user.routes.js'
import './server/models/User.model.js';

//initialize express

const app = express()

//connect to db
await connectDB()
await connectCloudinary()


app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks)

//Middlewares
app.use(cors())
app.use(clerkMiddleware())

//ROutes
app.get('/', (req, res) => res.send("Api working"))
app.post('/clerk', express.json(), clerWebHooks)
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)


//Port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
    
})

