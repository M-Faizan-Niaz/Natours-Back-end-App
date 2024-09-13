const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// User resources is different form all the other resources
// because it all things has to do with Authentication
router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// PROTECT ALL ROUTES AFTER THIS MIDDLEWARE
router.use(authController.protect);
// we will do a patch beacuse we are actually changing
// , manipulating the user document
router.patch(
  '/updateMyPassword',

  authController.updatePassword
);

router.get(
  '/me',

  userController.getMe,
  userController.getUser
);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));// from this point on 
// all the routes are not only protected but also restricted only 
// to the admin

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

// these first routes are open to everyOne , so signing up, logging in
// forget password, and reset password for none of these you need to be logged inn
// But you need to be logged in so to be authenticated to update your password
// to get your own information , to update or to delete your
// own account , we don't want basically to public to get these information
// about all the users
// we know that this protect function here is just a MIDDLEWARE
// and middleware always runs on sequence , now this
// router that we have here that we created in the beginning
// is kind of a mini application , and just like with the regular app
// we can use middleware on this router as well and so we can do something like this
// router.use(authController.protect); and that's it , what it will do
// is basically protect all the routes that come after this point
// and that's because middleware runs in sequence , this will then only
// call the next middleare if the user is AUTHENTICATED and the
// next middleware in this case is patch here , all of the middleware
// that comes after this is now protected
