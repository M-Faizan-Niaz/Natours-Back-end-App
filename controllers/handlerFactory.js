// ADDING VERY SIMILAR HANDLERS TO ALL OF OUR CONTROLLERS
// will create a lot of duplicate code , Because all these update handler, all these delete handlers , all these create handlers
// they really all just look basically the same , also if we want to
// change some http status code or status messaage , then we would have to go each and every controller
// and then change all the handler there , so instead of manually writing all these function, why not simply create a
// --> "FACTORY FUNCTION" that gonna return these handler for us
// so factory function is exactly that , it is a funcition that return another function
// and in this case our handler function,
// inside FACTORY FUNCTION we will pass in the model

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

// we call this function deleteOne because this function is not only
// going to work on delete tours but also to the delete reviews and users
// and in the future some other documents
// so this is basically the generalization of this specific function
// which worked only for tours and now this new one works for every model

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

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // we are gonna update a tour based on a ID
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // bool-true return the modified document rather than the original defaults to false
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No Document find with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // The request object is what hold all the data, all the information
    // about the request
    //console.log(req.body);
    const doc = await Model.create(req.body); // we call this create method right on the model itself

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
// let' create some factories for getting documents
// let's start with getOne, this one is actually a trickier
// and that's because we have a populate in the getTour handler
// which is different from all the rout Handlers in other resources
// but well this is not really a problem , because we will simply
// allow ourselves to pass in populate options into our getOne function

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    //.populate('reviews');
    // also we need to make some changes here now because of this populate
    // so basically first we create the query and then if there is
    // populate options object we will then add that to the query
    // and then by then , await that query
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to read from database we use find() method

    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .paginate();
    //const doc = await features.query.explain();
    const doc = await features.query;
    // in a query I add explain method , after the query we
    // will then call explain , then we will get completely
    // different result which is basically these statistics a lot of stuff wil be there
    // we are only interseted in execution statistics, we query
    // for three documents and we got it but the number of document
    // we were examined is nine --> And so this means that the MONGODB
    // had to examine so basically to scan all of the nine documents
    // inorder to find the correct three ones that match the query
    // and that's not efficient at all , --> WITH "INDEXES" we will be
    // able tp solve this problem , so we can create indexes on specific fields in a collection
    // For example MONGO automatically creates an index on the id field by default
    // at MONGODB compass we have indexes , by defalut we have an
    // id index , and this id index is then basically an ordered lidt
    // of all the ids that get stored somewhere outside of the collection
    // this INDEX is extremely useful because whenever documents
    // are queried by the ID MONGODB will search that ordered index
    // instead od searching through the whole collection and look at the all the documents one by one
    // which is ofcourse much slower , without an index Mongo has to look
    // at each document one by one , but with an index on the field
    // that we are querying for this process becomes much more efficient
    // and that is pretty smart ,and ofcourse we can set our own indexes
    // and ofcourse we can set our own indexes on field that we query often
    // let's do for price
    // so in tourModel we did this -> tourSchema.index({price: 1})

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

// we can also get couple of statistics about the query itself
