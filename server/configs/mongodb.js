import mongoose, { mongo } from 'mongoose'

//connect to db

const connectDB = async ()=>{
    mongoose.connection.on('connected', ()=> console.log('Database Connected'))

    await mongoose.connect(`${process.env.MONGODB_URI}/mindspring`)
}

export default connectDB

