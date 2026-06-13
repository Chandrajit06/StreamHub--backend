import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken       
        await user.save({ validateBeforeSave: false })       
        //  saving refresh token in db and escaping unrelated validations to block the save.

        return { accessToken, refreshToken }
    } 
    catch (error) {
        throw new ApiError(500, "Error while generating access and refresh token")
    }
}


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


const loginUser = asyncHandler( async(req, res) => {
    
    // get user details from frontend
    // username or email base
    // find the user if exist
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body

    if(!username && !email)    throw new ApiError(400, "username or email required")

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user)      throw new ApiError(404, "User does not exist")
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid)      throw new ApiError(401, "Invalid user credentials")

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")       // updated user

    const options = {                  // only modifiable from server
        httpOnly: true,
        secure: true,
    }

    return  res.status(200)
               .cookie("accessToken", accessToken, options)      // Browser receives it and saves the cookie
               .cookie("refreshToken", refreshToken, options)
               .json(
                    new ApiResponse(200, 
                        { user: loggedInUser, accessToken, refreshToken }, 
                        "User Logged In Successfully")
                )

})


const logoutUser = asyncHandler( async(req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }    // removing refresh token from the database
        },
        { new: true }         // returns document after update
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
              .clearCookie("accessToken", options)     
              .clearCookie("refreshToken", options)     // removing refresh token from the browser storage
              .json(new ApiResponse(200, {}, "User logged out successfully"))

})


const refreshAccessToken = asyncHandler( async(req, res) => {

    const incomingRefreshToken = (req.cookies.refreshToken || req.body.refreshToken)
    if(!incomingRefreshToken)     throw new ApiError(401, "Unauthorized Account")     // No token sent 

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)   // expired
        const user = await User.findById(decodedToken?._id)
        if(!user)     throw new ApiError(401, "Invalid Refresh Token")             // User deleted

        if(incomingRefreshToken !== user?.refreshToken)   
            throw new ApiError(401, "Refresh token is expired or invalid")        // Logged out/stolen

        const options = {
            httpOnly: true,
            secure: true,
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(new ApiResponse(200, 
                    {accessToken, refreshToken: newRefreshToken},
                    "Access Token Refreshed",
                ))
    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}