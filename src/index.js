// require("dotenv").config({path: "./env"})
import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
})

import { app } from "./app.js";
import connectDB from "./db/index.js";
connectDB()

.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("DB connection failed ", error)
})






/*
import mongoose from "mongoose";           // mongoose connects with db
import { DB_NAME } from "./constants";
import express from "express";
const app = express()            // app => web server instance

( async() => {        // DB connection (iife)
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on("error", (error) => {         // Listens for any server errors 
            console.log("Error", error);
            throw error
        })
        app.listen(process.env.PORT, () => {             
            console.log(`App is listening to port ${process.env.PORT}`);
        })
    }
    catch(error){
        console.log("Error: ", error)
        throw error
    }
})()
*/