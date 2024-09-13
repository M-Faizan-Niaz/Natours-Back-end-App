const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// name, email, photo, password , passwordConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your Name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provdie a password'],
    minlength: 8,
    select: false, // password will not be shown in any OUTPUT
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE AND SAVE!!!
      // it will only work when we create a new Object
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not  the same ',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true, // also we don't want to show this in output
    // because we basically want to hide this implementation detail from the user
    select: false,
  },
});

//ENCRYPTION--> and the reason why we are doing like this is
// that the middleware function we are gonna specify here ,
// so the encryption gonna be happened between the momoent that
// we recieve the data and the moment where it's actually persisted to , so that's where pre-save middleware runs
//  "BETWEEN GETTING THE DATA AND SAVING IT INTO THE DATABSE "

userSchema.pre('save', async function (next) {
  // we only want to encrypt the pssword if the password field has actually been updated
  // only when password is changed or also when it is created new ", we can do with MONGOOSE
  // we hava a method on all document which we can use , if a
  // certain field has been  modified
  if (!this.isModified('password')) return next(); //IF THE PASSSWORD NOT BEEN MODIFIED SO IN THIS CASE SIMPLY RETURN
  // we wil use the term Hashing --> Encryption
  // we are gonna do Encryption or Hashing by
  //using very well known ,  popular hashing algorithm called "bcrypt"
  // this algo will first salt then hash our password inorder to make it very strong to protct it from bruteforce attacks
  // so that's the whole reason why encryption needs to be really strong because bruteforce attacks could try to guess a
  // certain password if it is not really stronn encrypted
  // I said bcrypt will salt our password that just means it is gonna add random string to the password ,
  // so that two equal passwords do not generate the same hash

  // HASH the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // DELETE passwordConfirm field
  this.passwordConfirm = undefined;
  next(); 
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // putting this passwordChange
  // one second past will then ensure then the token iks always created
  // after the password has been changed
  next();
});

// we do not want to show in active user in the output,
// we will implement this using query Middleware , because
// we can add a step before any other query we are doing somewhare in app
userSchema.pre(/^find/, function (next) {
  // this points to the current query , lets see how it works
  // we actually using regular expression before basically to say
  // we want this middleware function to apply on every query
  // that starts with find
  // we have our getAllUsers and there we have a find query
  // and before query gets actually executed , we want to add something
  // to it , which is we only want to find the documents which have the active property
  // set to true
  this.find({ active: { $ne: false } });
  next();
});

// we are gonna create instance method it is basically a method that is available on all methods of a certain collection]
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // inside of this instance method , since they are available on this documwnt the this keyword actually points
  // to the current document
  return await bcrypt.compare(candidatePassword, userPassword); // this compare function will very simply return
  // true if these two passwords are the same and false if not , without this compare fn we have no way of comparing
  // candidatePassword is not hashed it is original password  coming from the user
  // but userPassword is ofcoursed hashed and without compare() we have no way of comparing it
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // password reset token should be a random string
  const resetToken = crypto.randomBytes(32).toString('hex'); // generating token
  // Why actually we are creating this token ?
  // Basically this token is what we are gonna send
  // to the user , so its like a reset password really
  // that the user can then use to create a new real password
  // ofcourse , only the user will have access to this token , so infact it
  // really behave like kind of password , so just like password
  // we should not store plain in database , so encrypt it

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
  // we send one token via email, and one we have encrypted version
  // in our database , that encrypted one is basically
  // useless to change the password , it is just like when
  // we were saving actually encrypted password
  // into the database
};

const User = mongoose.model('User', userSchema);
module.exports = User;
