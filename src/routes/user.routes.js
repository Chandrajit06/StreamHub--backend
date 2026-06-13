import {Router} from "express"
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const userRouter = Router()

userRouter.route("/register").post(
    upload.fields([                         // upload images through multer middleware
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)          // goes to /register and calls registerUser fn

userRouter.route("/login").post(loginUser)


// secured routes

userRouter.route("/logout").post(verifyJWT, logoutUser)

userRouter.route("/refresh-token").post(refreshAccessToken)

export default userRouter