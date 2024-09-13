// It's kind of convention to have express configuration in app.js
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
// static file is file system that we currently cannot access using our routes

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// 1) GLOBAL  MIDDLEWARES

// Set security HTTP headers
app.use(helmet()); // all we have to do isto call helmet here , so
// that will then produce the middleware function

// Development loggin
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// IMPLEMENTING RATE LIMIT INORDER TO PREVENT SAME IP DOING SO MANY REQUEST
// TO OUR API this will help us preventing BRUTE FORCE ATTACK
// IT IS GONNA BE OUR global MIDDLEWARE
// RATE LIMIT -> is gonna count the number of request coming from one IP
// AND WHEN THERE ARE TOO MANY REQUEST LOGGED THEDE REQUEST, so it make sense to implement
// this in global middleware
// we gonna use express package express rate-limit
// LIMIT REQUEST FROM SAME API
const limiter = rateLimit({
  // rateLimit is ab function which recieves an object of options
  // and here we can basically define how many request in our IP
  // we are gonna allow in a certain amount of time
  max: 100, // what this will do is allow 100 request from the same IP, in 1 hour
  // if then limit is crossed then will get back an error message
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in one hour',
  // this limiter function is really a middleware function
});

app.use('/api', limiter);

// BODY PARSER, reading data from the body into req.body
app.use(express.json({ limit: '10kb' })); // it can modify the incoming request data

// DATA SANITIZATION --> means to clean all the data that comes into the
// application from malicious code , so the code that is trying to attack our application
// in this case we are trying to defend against two attacks
// we will do this right here after the body parser
// this line 51 reads the data into request.body and only after that
// we can clean that data, THIS IS THE PERFOECT PALCE FOR DOING THE DATA SANNITIZATIO

// DATA SANITIZATION against NoSQL query injection
app.use(mongoSanitize()); // what this middleware does is , look at the request body
// , the request query string and also request.params and then it will basically filter out
// all of the dollar signs and dots , because that's how MONGODB operators are written
// by removing that , by removing that well these operators are then no longer work

// DATA SANITIZATION against XSS
app.use(xss()); // this will then clean any user input from malicious HTML code
// imagine that an attacker would try to insert some malicious HTML code
// with some javaScript code attached to it , if that would later be injected
// in our HTML site , it could really create some damage then
// using this MIDDLEWARE we prevent that basically by converting
// all these html symbols , as I said before the MONGOOSE validation is already
// a very good protection against xss, because it wo'nt really allpw crazy stuff to go into
// our database as long as we use it correctly

// PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // clear up the query string

// serving static files
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  next();
});

// 2) ROUTE HANDLERS

//app.get('/api/v1/tours', getAllTours);
//app.get('/api/v1/tours/:id', getTour);
//app.post('/api/v1/tours', createTour);
//app.patch('/api/v1/tours/:id', updateTour);
//app.delete('/api/v1/tours/:id', deleteTour);
//URL is exactly the same no matter if we want to get a new tour or create a new tour

// we actually have two http methods to update data
// we have PUT and we have PATCH, with PUT we expect that our application
// recieves entire new updated object , with PATCH we only expect
// the properties that should actulaly be updated on the object

// 3)ROUTES
// we will use this new router as a middleware to connect to ou app , this tourRouter is actually a middleware

// 3) ROUTES
app.use('/api/v1/tours', tourRouter); 
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter); // whenever there is a request with a URL
// that starts like this then this Middleware function here will basically be called
// and that is then our router and in there just there is slash route

// if we are able to reach this point here this means that request ,
// response cycle is not yet finished at this point in our code
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server!`, 404)); //it is assumed that whatever is passed in next() is error
  // then it will skip all the MIDDLEWARE in the MIDDLEWARE STACK
}); // gonna work for all the http method

// TO DEFINE ERROR HANDLING MIDDLEWARE all we have to do
// is to give MIIDLEWARE function 4 arguments , EXPRESS

app.use(globalErrorHandler);

module.exports = app;

// Routing means how  an application  will respond to the certain client request, to a certain URL
