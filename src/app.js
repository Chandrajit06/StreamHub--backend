import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()
app.use(cors({              // Allows requests only from the origin defined in .env
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({             // Parses HTML forms submit data
    extended: true,
    limit: "16kb",
}))
app.use(express.static("public"))        // Serves static files (images, CSS, JS) from the public folder
app.use(cookieParser())



import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter)    // gives control to userRouter when /users is typed


export { app }