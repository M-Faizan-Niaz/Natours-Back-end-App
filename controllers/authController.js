// All functions related to AUTHENTICATION will go here
const crypto = require('crypto');
const { promisify } = require('util'); // since we are only gonna use that one promisify method we destruct that object and take
const jwt = require('jsonwebtoken'); // promisify from there
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
// json web token should be stored in secured http only cookie , but right nowe
// we are only sending the token as a simple string in our json response, let's
/// also send the token on form of cookie so let the browser store in more secure way

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  //  A COOKIE IS JUST A SMALL PIECE OF TEXT, THAT A SERVER CAN SEND THE CLIENT
  // then when client recieves a cookie it will automatically stores it
  // and then automatically send it back along with all future request to the same server
  // brpwser automatically stores a cookie that it recieves
  // and send it back to all future request to that server where it came from
  // SEDNING A COOKIE IS VERY EASY JUST ATTACH IT TO THE RESPONSE OBJECT
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 100
    ),

    // the cookie will only be sent on an encrypted connections
    // basically we are using https
    httpOnly: true, // COOKIE cannot be accesed or modified in any way by the browser
    // this is important in order to prevent those cross side scripting attacks
    // all the browser gonna do is to recieve the cookie , store it and send it
    // automatically along with the request
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // remove the password from the output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// I am not calling it create user like I did in tourController
// because that (signup) has the more meaning in context of AUTHORIXATION
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role || 'user',
  }); // usually when we signup for any web application then you also get automatically logged inn so let's implement it
  // logged the new user inn as soon as he signed up
  // first fn we are using with JWT is sign so in order to create a new token
  // in sign fn we are passing the first thing is payload and this is
  // basically an object for all the data so we are gonna stire inside of the token and in this case we only want id of the user
  // so that's the object that's the data we want to put in our JWT,
  // now we have created the token now we are gonna send it to the client

  createSendToken(newUser, 201, res);
});

// LOGGING user inn based on a given password and email address
// logging a user means basically means sign a JSON web token and send it back to the client , but in this case we only issue
// the token incase that the user actually exist and that the password is correct
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //this is how the user is gonna send in the login credentials for us to check

  // 1) Check if email password exist
  if (!email || !password) {
    // if there is no email and there is no passwrod then we get this error
    return next(new AppError('Please Provide email and password!', 400)); //after calling the next middleware we wanna make
    // sure that this login function here finishes right away
  }

  // 2) Check if user exist && password is correct

  const user = await User.findOne({ email }).select('+password'); // we need to select the password explicitly
  // we use select to simply select couple of field from the database only the ones that we needed
  // now in this case , when we want the field that is by default not selected we need to user plus and then the name of the field
  // password in this case , so now it will be back in the output
  console.log('User fetched during login:', user);

  // now it's time to compare the password that we have in the database with the one that user is just posted
  // because the password that might be is 'pass1234'  but the one that we have stored in the document looks
  // like this '$2a$12$NxVctx5IwuopCGGH7HhWPu39y6R7MgYVA.FXSOIbmhH5Yo7MF9v4i'  , so how we are gonna
  // comapare this 'pass1234' === '$2a$12$NxVctx5IwuopCGGH7HhWPu39y6R7MgYVA.FXSOIbmhH5Yo7MF9v4i' and there is a way of
  // doing this is to use bcrypt package we used bcrypt to generate this hashed password and we can also use this package to
  // compare an original password with the hash password , only way of doing is it to actually encrypt this (pass1234) as well
  // and then compare it with encrypted one
  // we gonna do this in userModel because it is related to the data
  // it will return either true or false, correctPassword
  // is an asyncronus function
  if (!user || !(await user.correctPassword(password, user.password))) {
    // if there is no user or there is wrong password
    // then create this error
    return next(new AppError('Incorrect Email or password', 401));
  }

  // 3) if everything ok , send token (JSON web token) to client

  createSendToken(user, 200, res);
});

// CREATING NEW MIDDLEWARE FUNCTION
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  console.log('Role from DB:', currentUser.role);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  req.user = currentUser;
  console.log('Current User:', req.user);
  next();
});

// usually we can not pass the arguments to the MIDDLEWARE
// but in this case we want to , we want to pass in a roles
// who is allowed to access a resource .
// here we will actually create a wrapper fn which will wrap return
// the MIDDLEWARE function we actually want to create

// Middleware to restrict actions based on user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    }
    next();
  };
};

// You just have to provide your email address, and then you will get an
// email with a link, then that's gonna take you to a page , where you gonna
// put in a new password .....
// PASSWORD RESET FUNCTIONALITY , There are two steps
// 1ST STEP --> User sends a post request to a forgot password route
// only with his Email address , this will then create a reset token
// and send that to the email address that was provided
// just a simple web token not JSON web token
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  // not findbyID , findOne because we don't know the id , and
  // user offcourse also does not know his own id , so we specified
  // the email address the only piece of data that is known
  if (!user) {
    // verify if user does exist
    return next(new AppError('There is no user with that email address', 404));
  }

  //2) Generate the random reset token

  // for that we gonna create instance method on a user
  // because this really has to do with the user data itself

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // this will then deactivate all the
  // validators that we specified in our schema

  //3) Send it to user's email
  // so ideally , the user will then click on this email
  // and will then be able to do the request from there
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your passsword? Submit a PATCH request with your new password
 and passwordConfirm to: ${resetURL}.\nIf you did'nt forgot your password please ignore 
 this email!  `;

  // we want to do more simply send an error down to the client
  // so using try catch block
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email!, Try again later',
        500
      )
    );
  }

  // sendEmail is an asynchronus fn
}); // here we actually got a send plain original reset token
// not the encrypted one , we will then in a next step
// compare the original token with the encrypted one

exports.resetPassword = catchAsync(async (req, res, next) => {
  // now finally the last part of the PASSWORD reset functionality
  // where we actually set the new password for the user
  // 1) Get user based on the token
  // (reset token that is actually sent in the URL is this
  // non-encrypted token here , but the one that we have
  // in database is the encrypted one , so we need to
  // encrypt the original token again so we can compared it
  // with the encrypted one that is stored in the database
  // encrypt the token and compare it with the encrypted one in databse
  const hashedToken = crypto // crypto package
    .createHash('sha256') // name of the algorithm
    .update(req.params.token) // for the string we wanna hash
    .digest('hex');
  // this token is only thing that can identify the user , so we can
  // query the database with this user which has this token

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user , set the new Password
  if (!user) {
    return next(new AppError('Token is invalid or has expired!', 400));
  }
  // we already get the user ,
  user.password = req.body.password; // and that's because we will ofcourse
  // send password and passwordConfirm via body
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // now we need to save the document , because this only modifes the document
  // it does not really update , it does not save it
  await user.save(); // in this case we don't really have to turn off the validator
  // because we want the validator
  // for example we need a validator to check password === passwordConfirm

  // 3) update changedPasswordAt property for the user
  //4) log the user in , send JWT
  createSendToken(user, 200, res);
});

// We allowed user to basically reset it's password and then create new one
// but now we also want to allow logged in user to simply update
// his password without having to forget it, without that whole reset  process

exports.updatePassword = catchAsync(async (req, res, next) => {
  // **REMEMBER this password updating functionality is only for the logged inn user
  // but still we need user to pass his current password
  // inorder to confirm that user is actually is who he says
  // so just as a security measure
  // as a security measure we always need to ask for the current password
  // before updating

  // 1) Get the user from the collection

  // now from where this id actually coming from ,
  // rememebr that this updatePassord is only for logged in user
  // so therefore we already have the current user on our request object
  // that exactly coming from the protected middleware
  const user = await User.findById(req.user.id).select('+password'); // we need to explicitly ask for the password
  // because it is bydefault not included in the output, we define this i schema
  // 2) Check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong ', 401));
  }

  //3) if password is correct update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // and the validation will then done automatically by the validatorsthat we defined
  // in the schema
  await user.save(); // we want the validation to happen
  // User.findByIdAndUpdate will not work as intended
  // 4) Logged user inn send the JSON web token to the user now logged in with
  // the new password that was just updated
  createSendToken(user, 200, res);
});
