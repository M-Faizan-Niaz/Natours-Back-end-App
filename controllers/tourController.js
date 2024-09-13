const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const Tour = require('./../models/tourModel');
const { Mongoose } = require('mongoose');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next(); // it will set these properties of the query object to these values that we specified here ,
  // basically prefilling a part of the query object before we then reach to alltour handler
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// the path property is basically the field that we want to populate
// and then we can also specify select, where we specify which of
// the field we actually want to get

/*catchAsync(async (req, res, next) => {
  //req.params is where all the parameters, all the variable we define here are stores

  const tour = await Tour.findById(req.params.id).populate('reviews');
  /*const tour = await Tour.findById(req.params.id).populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
     
  });
  // this properties will not be shown, will only get the data we are intersetd in

  // THIS is where we build our
  // query and now we need to do isto add Populate to the query ,
  // we now want to populate basically fills up the field called guides
  // in our model , this guides field only contain the reference
  // and with populate we are then gonna fill it up with the actual data
  // only in the query not in the actual databsase
  // instead of just passing the string in population, we can create an option of object , WANT TO ONLY GET  THE DATA
  // we are intersted in

  // --> "POPULATE" Function is absoultely  fundamental tool for working with data in MONGOOSE
  // Behind the scenes using populate will still actually create a new query
  // and so this might affect your perfromance , it really makes a
  // sense that how else would MONGOOSE be able to get data about
  // tours and users at the same time , it needs to create a new query
  // basically in order to create this connection
  // we did this at query middleware at tour model
  // Tour.findOne({ _id: req.params.id})

  if (!tour) {
    return next(new AppError('No tour find with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});*/

exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour); //so calling this function here
// will then return another fucntion which will then sit here
// and wait until it is finally called as soon as we hit the corresponding route
/*exports.deleteTour = catchAsync(async (req, res, next) => {
  console.log('User role at start of delete route:', req.user.role);

  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});*/

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    // match is for filter
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    }, // usually this match state is just the premilinary stage for then preparing for the next stages

    {
      // in group we always pass an object
      $group: {
        // it allows us to group the dcuments together basically using accumalators
        // accumulators can even calculate an average  , if we have 5 tours each of them has ratings
        // we can then calculate average ratings using group
        //_id: null means we want everything in one group
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    /*{
        $match: { _id: { $ne: 'easy' } },
      },*/
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

//implememt a function that calculate the busiest
//month in a year , basically how many tours start in each of the month of
//the given year
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
      // gonna deconstruct an array field from the input document and then output one document
      // for each element of the array , now we will have one documents sor each of the dates
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

//  /tours-within/:distance/center/:lating/unit/:unit
// /tours-within/233/center/34.111745,-118.11346/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  // using simple destructring , inorder to get all our data once
  // from the parameters
  const { distance, latlng, unit } = req.params; // at req.params we have these
  // now will get coordinates from this latitude and longitude variable here
  //  34.111745,-118.11346 , this is the format we expect our latitude
  // and longitude lookslike
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  // this kind of crazy conversion is necessary because normally it would
  // expects the radius of our sphere to be in radians

  if (!lat || !lng) {
    next(
      new AppError(
        'Please Provide latitude and longitude in the format lat,lang',
        400
      )
    );
  }

  // writing geospetial query which is same as regular query,we basicallyt want to
  // query fior the start location, because startLocation field is what hold gepspetial point
  // where each tour starts, and that exactly we are searching for
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  // geoSpetial operator $geoWithin, and this operator
  // does exactly what it says , so basically what it finds documents
  // within a certain geometry , and that geometry is what we need to
  // define as next step , so we want to find documents but where do we
  // actually want to find these documents, well we want to find them insodes
  // of sphere that start at this point we defined and which has a radius
  // of the distance that we defined , so in our example in LossAngeles if you specofy the
  // distance of 200 miles then that means you want to find all the tour
  // documents within a sphere that has a radius of 250 miles
  // and so now we need to pass this information into geo within operator
  // $centerSphere operator takes an array of the coordinates and of the radius,
  //
  // how will you define coordinates? for that we need yet another array and then the longitude and the
  // latitude , first you always need to define the longitude
  // and then the latitide {startLocation: {$geoWithin: {$centerSphere:[[lng, lat]]}}}
  // so that is the center of the sphere , now we need to specify it's radius
  // where we actually do not pass in the distance , instead MONGODB
  // expects a radius in a special unit called RADIANS
  // ---- we need to add an index to start the location in tourModel
  // so with this gepSpetial query that we just defines here we basically
  // found documents that are located within a certain distance of our starting point

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please Provide latitude and longitude in the format lat,lang',
        400
      )
    );
  }
  // now let's do actual calculation, just like before in order to
  // to do calculations we always do the aggregation pipeline , remember that is called
  // on a model itself
  const distances = await Tour.aggregate([
    // for geoSpetial Aggregation there is one single stage and that's
    // geoNear
    {
      // this is the only geoSpetial pipeline stage that actualy exist
      // and this one always needs to be the first one in the pipeline
      $geoNear: {
        // startLocation field si going to be used for the caslculations
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        }, // near is the point from where we calculate the distances
        distanceField: 'distance',
        distancesMultipiler: multiplier, // same as dividing by 1000
      },
      // Geonears requires atleast one of our fields conatains a geoSpetial
      // index , we already did this before our startLocation has 2dSphere index
      //on it , since we are using this startLocation inorder to calculate the
      // distances , well that's then perfect , if there  is only one field
      // with geoSpetial index , then this geoNear stage here well automatically
      // use index in order to perform the calculations
    },
    {
      $project: {
        distance: 1, // means we want distance ,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',

    data: {
      data: distances,
    },
  });
});
