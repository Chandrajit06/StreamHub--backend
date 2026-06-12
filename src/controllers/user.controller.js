import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async(req, res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: email
    // check for images, avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // check for user creation
    // remove password and refresh token field from response
    // return res

    const {fullName, email, username, password} = req.body     // Extracts 4 fields from the HTTP request body
    
    if([fullName, email, username, password].some((field) => field?.trim() == ""))
        throw new ApiError(400, "All fields are required")
    // the ?. is optional chaining; it calls .trim() only if field is not null/undefined

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })
    if(existedUser)    throw new ApiError(409, "User already exists")

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if(!avatarLocalPath)    throw new ApiError(400, "Avatar file is required")
    // req.files is an object provided by Multerthat contains all files uploaded

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar)    throw new ApiError(400, "Avatar file is required")

    const user = await User.create({           // creates user in db
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    // Find the user by ID in MongoDB → return all fields except password and refreshToken

    if(!createdUser)   throw new ApiError(500, "Error while registering user")

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered successfully")
    )

})

export {registerUser}
