class ErrorHandler extends Error {
    statusCode: number;
    constructor(statusCode: number, message: any) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ErrorHandler;