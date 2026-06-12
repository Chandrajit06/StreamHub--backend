// This code creates a blueprint for sending responses from your server to the user in a consistent format.

class ApiResponse{
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode<400
    }
}

export {ApiResponse}