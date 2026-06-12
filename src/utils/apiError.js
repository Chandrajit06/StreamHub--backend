class ApiError extends Error {       // This creates a custom error specifically for API.
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [] ,
        stack = "",
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){     // It's a trail that tells where exactly the error happened in code
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this, this.constructor)  
        }
    }
}

export {ApiError}