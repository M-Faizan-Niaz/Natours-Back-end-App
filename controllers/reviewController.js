const Review = require('./../models/reviewModel');
//const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

// it is gonna be a async fun because we are gonna deal with database

//exports.getAllReviews = factory.getAll(Review);
/*catchAsync(async (req, res, next) => {
  // what we are gonna do is to check . if there is a tourId
  // and there is one well , then we are only gonna search for
  // reviews equal to that tour ID
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };
  // if there is a tour id then basically this object here is what
  // will be here , and then only the reviews  where tour
  // matches the id are going to be found, so if it is our
  // regular API call without nested route well then that filter
  // will simply be this empty object and then we are gonna find all the reviews

  const reviews = await Review.find(filter);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});*/

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
  // Allow nested routes, with this we actually make it so
  // that the user can still specify manually the tour and the user id
  // if (!req.body.tour) req.body.tour = req.params.tourId;
  // if (!req.body.user) req.body.user = req.user.id;
  // this two above line code is not in our generic createOne function
  // how can we fix that>
  // how can we fix that? well we can actually create a MIDDLEWARE
  // that is going to run before createReview and so , that
  // actually also make it a more decoupled , this two line code
  // will be in annother function
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
