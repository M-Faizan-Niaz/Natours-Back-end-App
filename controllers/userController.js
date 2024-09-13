const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  // rest parameters for allowed fields , so this will then basically creates an array containing
  // all of the arguments that we passed in , in that case an array containing name and email
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  }); // that is the most easy way to loop through object
  return newObj;
}; // all we do here is basically loop through that are in the object (obj)
// and for each field we check if it is one of the allowed field
// and if it is then we create a new field in the new object with the same name
// with the exact same value it has in the original object and in the end we return

// Now we will ALLOW CURRENTLY LOGGED INN USER TO manipulate it's data
// it is updating the currently authenticated user,
// we are updating the user in a different route than updating the user password
// in typical web application how it is done, usually you have one
// place where you update password , and another place where you
// can update the data about the user or the account itself
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1)  CREATE AN ERROR IF USER TRIES TO UPDATE THE PASSWORD
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // we could try to do it with user.save() just like before getting the user then
  // updating the properties and then by the end saving the document
  // but the problem is that there are some fields that are required which we are not
  // updating and because of that we will get some error
  // so we can actually use findById and update
  // options sets to true so that it return a new object , basically the
  // updated object instead of the old one

  // 2) FILTERED OUT UNWANTED FIELDS NAMES THAT ARE NOT ALLOWED to be updated
  const filterBody = filterObj(req.body, 'name', 'email');
  // 3) Update user document,
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true, // indeed we want MONGOOSE to validate our document, for eg if we put an
    // invalid email address that should be catch by the validator and return an error
    // now WHY AM I PUTTING THE X HERE and not simply the request.body , thats because
    // we dont want to update everything that is in the body
    // lets suppose if user puts in the body a "role" for example , we couuld have body.role:'admin'
    // role set to admin for example , this would thaen allow any user to change the role for example
    // to administrator and fcourse that can not be allowed , so we need to make sure that the object we
    // pass here only contains name and email , beacuse these are the only fields we want to update
    // basically we want to filter the body so in the end it only contains name , email and nothing else
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// IT IS A GOOD PRACTICE TO IMPLEMENT A SLASH ME ENDPOINT in any API
// so basically an end point where a uer can retrieve his own data 
exports.getMe = (req, res, next) => { 
  req.params.id = req.user.id;
  next();
} // we will then add this middleware before calling getOne



// when user decides to delete his account , we actually do not delete that
// document from the database but instead we just set the account
// as inactive , so the user might at some point at the future re-activate the account
// so we can basically access the account in the future , even officially
// it has been deleted , for this we need create a new property at the schema
// to delete the user now , all we need tp do is to set that active flag to false
exports.deleteMe = catchAsync(async (req, res, next) => {
  // ofcourse this only works for logged in user , so the user id is conveniently
  // stored in req.user.id
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update Password with this!
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error!',
    message: 'This Route is not yet defined! Please usr sign up instead!',
  });
};
