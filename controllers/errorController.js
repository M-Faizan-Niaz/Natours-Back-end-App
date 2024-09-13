const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 404);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);

  const message = `Duplicate field value : ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid Token, Please LOGIN again!!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has Expired !! Please log in again', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational , trusted error: send message ti the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    //Programming or other ukonwn error: dont't leak error details
  } else {
    // 1) Log Error
    console.error('ERROR!!', err);

    // 2) Send generic message!
    res.status(500).json({
      status: 'error',
      message: 'Something went very Wrong!!',
    });
  }
};

module.exports = (err, req, res, next) => {
  // Capturing stack , each and every error get this stack Trace
  //console.log(err.stack); // will show us where the error happened
  // by defining 4 paramters so express
  // will automatically knows so this entire function here
  // is error handling middleware ,
  // 1st we create MIDDLEWARE then second we will create error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError;
    if (error.name === 'TokenExpiredError')
    

    sendErrorProd(error, res);
  }
};
