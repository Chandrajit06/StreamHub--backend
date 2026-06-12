import {Router} from "express"
import { registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"

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

export default userRouter