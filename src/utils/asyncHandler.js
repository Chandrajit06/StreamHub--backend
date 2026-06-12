const asyncHandler = (requestHandler) => {   // Takes async function input
    return (req, res, next) => {                    // Returns a new Express-compatible function
        Promise.resolve(requestHandler(req, res, next))     
               .catch((error) => next(error))
    } 
}

export {asyncHandler}            // asyncHandler wraps async route handler




// const asyncHandler = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }