import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler( async(req, _, next) => {    // find the user using jwt token

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // Authorization header → sent as Bearer <token>, so it strips the "Bearer " prefix to get the raw token
        if(!token)  throw new ApiError(401, "Unauthorized request")

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)    // Checks if the token is valid 

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user)   throw new ApiError(401, "Invalid Access Token")

        req.user = user
        next()
    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

})


// A JWT token is made of 3 parts separated by dots:
// eyJhbGciOiJIUzI1NiJ9  .  eyJfaWQiOiIxMjMifQ  .  SflKxwRJSMeKKF2QT4fwpMeJf
//      HEADER                    PAYLOAD               SIGNATURE