class AppError extends Error {
  // inheriting from builtin Error

  constructor(message, statusCode) {
    super(message); // inorder to call parent constructor

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
