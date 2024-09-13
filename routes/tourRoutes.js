const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');
const router = express.Router();
// the fourth argument val is the value if the parameter
//router.param('id', tourController.checkID);

// POST /tour/234fas4/reviews
// GET /tour/23456fd3/reviews
// GET /tour/23456dr6/94t6a8da

// the tour part here as you already know where we mounted
// this router and so thereofre we do not have to repeat it here

/*router
  .route('/:tourId/reviews')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview
  );*/

// we will basically say that this tour router should use the review router
// in case it ever encounters a route like this

router.use('/:tourId/reviews', reviewRouter);
// keep in mind that router itself is a MIDDLEWARE , so we can use a use methof
// on it , and then say that for this special route here we want to use the review
// router instead , so this is actually again mounting a router
// this router is a tour router and then we say well whenever you find a URL
// like this well, then just use the review router
// like this we have the tour router and review router nicely seperated
// and decoupled from one another , but now there is actually one piece
// missing , because this review router here can not get access to this
// tourId parameter , and now we need to enable review router to actually
// get access to this parameter here as well --> move to review router

// Create a checkBody middleware
// check if body contains the name property and price property
// if not , send back 404 (bad request)

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// at latlang variable we want pass in the coordinates of
// the place where you are , let's say you live in a los angeles
// and want to find all the tours within a distance of 300 miles
// tours-distance
//  /tours-within?distance=233&center=-40,45&unit=mi
// this has been a one way using query string and we have done
// it before , but instead we are going to do like this
//   /tours-within/233/center/-40,45/unit/mi
// this looks a lot cleaner ,and it is a kind of standard
// of specifying URL like this

// let's use geoSpetial aggregation in order to calculate distances to
// all the tours from a certain points , we are gonna calculate the distance from certain points
// to all the tours  that we have in our collection
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
 
router
  .route('/')
  .get(tourController.getAllTours) // we are gonna protecting this route
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  ); // protect MIDDLEWARE gonna run first if user is not AUthenticated
router 
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// param MIDDLEWARE is the only middleware that only runs
// for certain parameters, now the only parameter we have
// on our URL is our ID

// ---> IMPROVED NESTED ROUTES IMPLEMENTATION
// for that we are gonna use special advanced express feature
// in last video the review route was in the tour route because
// review belong to a review in a sense , the problem with this implementation
// is it is a bit MESSY and that is because we put a route for creating a review
// in the tour router simply because router starts with slash tour so it's a bit
// confusing , we will fix it using advanced express feature called MERGE PARAM
// imporitng review router into tour router
module.exports = router;

// the TOUR API that we have here is basically what we want to
// expose to the world , so for example we might want to allow
// other travel sites to embed our tours into their own websites
// and so that's what this API is basically for , so therefore
// we eill not have any authorization on get tour requests
