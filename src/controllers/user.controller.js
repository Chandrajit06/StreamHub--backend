import mongoose from "mongoose";
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
            $unset: { refreshToken: 1 }    // removing refresh token from the database
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

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

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


const changeCurrentPassword = asyncHandler( async(req, res) => {

    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)       // as user is looged in, user comes from req.user in auth

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect)     throw new ApiError(400, "Invalid Old Password")

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
              .json(new ApiResponse(200, {}, "Password changed successfully"))

})


const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
              .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


const updateAccountDetails = asyncHandler( async(req, res) => {

    const {fullName, email} = req.body
    if(!fullName || !email)    throw new ApiError(400, "All fields are required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: {fullName, email} },
        {new: true},
    ).select("-password -refreshToken")

    return res.status(200)
              .json(new ApiResponse(200, user, "Account details updated successfully"))

})


const updateUserAvatar = asyncHandler( async(req, res) => {

    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath)    throw new ApiError(400, "Avatar file is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url)      throw new ApiError(400, "Error while uploading on cloudinary")

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {$set: { avatar: avatar.url }}, 
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200)
              .json(new ApiResponse(200, user, "Avatar updated successfully"))

})


const updateUserCoverImage = asyncHandler( async(req, res) => {

    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath)    throw new ApiError(400, "CoverImage file is missing")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url)      throw new ApiError(400, "Error while uploading on cloudinary")

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {$set: { coverImage: coverImage.url }}, 
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200)
              .json(new ApiResponse(200, user, "CoverImage updated successfully"))

})


const getUserChannelProfile = asyncHandler( async(req, res) => {

    const { username } = req.params            // username of channel from url
    if(!username?.trim())     throw new ApiError(400, "Username is missing")
        
    const channel = await User.aggregate([  
        {
            $match: {                  // searching for a user in the db by their username
                username: username?.toLowerCase()
            },
        },
        {
            $lookup: {       // finding no. of subscribers as a channel
                from: "subscriptions",          // Go to the subscriptions collection(model)
                localField: "_id",              // Take the _id of the User
                foreignField: "channel",        // Match it with channel field in subscriptions
                as: "subscribers"               // Store all matched documents in a new field - subscribers
            }
        },
        {
            $lookup: {       // finding no. of subscribed channel as a user
                from: "subscriptions",                // search here
                localField: "_id",                    // use this as the basis of match
                foreignField: "subscriber",           // match it with localField(from)
                as: "subscribedTo"                    // store the whole document
            }
        },
        {
            $addFields: {         // adding fields to the object
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {              // currently visiting user is req.user
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {           // Only show these fields
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
            }
        }
    ])
    if(!channel?.length)   throw new ApiError(404, "Channel does not exists")
    
    return res.status(200)
              .json(new ApiResponse(200, channel[0], "channel fetched successfully"))

})


const getWatchHistory = asyncHandler( async(req, res) => {

    const user = await User.aggregate([
        {
            $match: {           // Converts req.user._id (a string) to a proper MongoDB ObjectId and find
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {          // Fetch full Video documents 
                from: "videos",                     // Look into the videos collection
                localField: "watchHistory",         // Use User's watchHistory array as the source
                foreignField: "_id",                // Match against Video's _id
                as: "watchHistory",                 // Store full user doc into watchHistory
                pipeline: [
                    {
                        $lookup: {            // Fetch full User document for each video
                            from: "users",                // Go into users collection
                            localField: "owner",          // Take Video's owner field
                            foreignField: "_id",          // Match with User's _id
                            as: "owner",                  // Store full user doc in owner
                            pipeline: [{
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                                },
                            }]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }        // $first unwraps the array and gives the object
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
              .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}