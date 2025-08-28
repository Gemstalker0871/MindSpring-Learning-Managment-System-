import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerWebHooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educator.routes.js'
import { clerkMiddleware } from '@clerk/express'

//initialize express

const app = express()

//connect to db
await connectDB()

//Middlewares
app.use(cors())
app.use(clerkMiddleware())

//ROutes
app.get('/', (req, res) => res.send("Api working"))
app.post('/clerk', express.json(), clerWebHooks)
app.use('/api/educator', express.json(), educatorRouter)

//Port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
    
})

