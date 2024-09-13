const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

// first thing I want to do is to basically protect all the routes
// which have to do woth reviews , so we want no one who is no
// authenticated to get or to post , or to change or delete any reviews

router.use(authController.protect); // this means that from this point
// no one can acces any of this route without being authenticated
// so now AUTHENTICATION is out of the way , let's think about
// AUTHORIZATION, -> first of all ony user should be able to post
// reviews , No guides also , NO administrators, then admins should be able
// to update or to delete reviews just like regular users ofcourse
// so that they can edit or delete their own reviews, and finally guides
// can not add, edit or delete reviews , since guides are the ones
// who are performing the job so it would be wierd if they could
// post reviews themselves, or edit other other peoples's reviews

// this basically the routes of the reviews

// we already have our getAllReviews handler function
// implemented , but right now all it does is basically get an array of all the
// reviews in the review collection, now a common use case of our API might
// be to get an array of all the reviews of one particular tour similar to createTour
// something like this  GET/tour/tga23rad7/reviews , we will have to do some simple
// changes in our getAllReviews
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );
// actually we want Authenticated users to be able to post reviews
// and also only users that are actually a regular users not administrator
// and also not tour guides
// FOR THIS FIRST REQUIRE THE AUTH CONTROLLER, and now al we have to do
// is to use MIDDLEWARE funciton that we specified there
module.exports = router;

//------------------------//
// so this is where the magical mergeParams comes into play , so in express
// router function we can specify some options and here all we need to do
// is to set {mergeParams:true} ,but why do we actually need this here?
// well , it's because, by default each router only have access
// to the paramaters of their specific routes, but here in this URL above
// for this post there is ofcourse actually no tour Id , but still want to
// get access to tour Id that was in this router , so inorder to
// get access to this parameter in this router we need to physically merge
// the paramaters
// so that's what mergeParams set to true does

// POST /tour/343wfa/reviews
// post /reviews

// both the routes will end up in this handler , that works because
// all of the routes starting with this /tour/343wfa kind of pattern here
// will be  redirected to this router
