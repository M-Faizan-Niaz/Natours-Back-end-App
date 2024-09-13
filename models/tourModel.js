const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

// MONGOOSE is all about Models , models is like a Blueprint we use to create Documents ,so its a bit like classes in JS
// which we can also use as Blueprint in order to create objects out of them , so we create models in MONGOOSE in order to create
// documents using it , and also to query, update and delete these documents so to perform all CRUD operations
// IN order to create a model we actually need a schema , we actually create a model out of schema.
// we use schema to describe our data to set default values , to validate data ...

const tourSchema = new mongoose.Schema(
  {
    // name : and what kind of data we want in it, we can define Scehma type options object for each fields
    name: {
      type: String,
      required: [true, 'A tour Must have a Name!'], // A validator
      unique: true,
      trim: true, // VALIDATION is basically a checking if the entered values
      // are in the right format for each field and also the values have been
      // actually been entered for all the required field
      maxlength: [40, 'A tour name must have les or equal than 40 characters'],
      minlength: [10, 'A tour name must more or equal than 10 characters '],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration..!'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a Group Size..!'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty..!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium , difficult',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
      // a setter function here which is going to be run
      // each time that there is new value for the
      // ratingsAverage field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a Price!'],
    },
    priceDiscount: {
      type: Number, // to specify our validator we use validate property
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price; // this only gonna point to
          // the current document when we are pointing to a new document
        },
        message: 'Discount Price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true, //will remove all widespaces form the beginiing and in the end
      required: [true, 'A tour must have a Summary..!'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image..!'],
    },
    images: [String], // an array in which we have number of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // this object is not for the Schema type object here
      // MONGODB uses a special data Format called GEOJSON in order to specify
      // GEO sPECIAL DATA
      type: {
        type: String,
        default: 'Point', // we can define multiple geometries but , default one is point
        enum: ['Point'],
      }, 

      coordinates: [Number], // that basically means we expect an array of NUmbers
      // and this array as the name says , is the coordinate of the point
      // with longitude first and only second latitude
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        enum: ['Point'],
        description: String,
        day: Number,
      },
    ], // this is how you create embeded document, Remember we always need to
    // use this array , so by specifying basically an array of object
    // this will then create brand new documents inside of the Parent Document
    // which is in this case is tour
    // {guides: Array},  CONNECTING TOURS AND USER guides, NOT BY EMBEDDING
    // INSTEAD by reference ->  this time the idea is that the tours and users will
    // always remain completely seperate entities in our dataBase ,
    // so all we save on a certain tour document of the users is the IDs
    // of the users that are the tour guide  for that specific tour, then
    // when we query the tour we want to automatically get access to
    // the tour guide , but again without them being actually saved on
    // the tour document itself ,and that exactly is referencing . --> implementing
    // reference using MOMGOOSE
    // here in guide we will now specify an array , then this means this will be sub documents

    guides: [
      // a new type that we never saw before
      { type: mongoose.Schema.ObjectId, ref: 'User' },
      // what does this means is that we expect the type of each
      // elements in the guides array to be a MONGODB iD, and this
      // should be inside an object just like any other Schema type definition
      // so type is of this MONGODB ID basically , and then we also need
      // to specify the reference (this is where magic happens bts) here we say that the reference should be a user
      // so this really how we we establish references between different data sets
      // in MONGOOSE
    ], // we will use a process called "POPULATE" in order to get access to
    // the referenced tour guide whenever we query for a certain tour, in last video
    // we created a reference to the user , here in the guides fields
    // right in our tour model and now we are gonna use populate in order to
    // basically replace the fields that we referencced with the actual related
    // data , and the result of that will look as if the data has always been
    // embeded , when infact , as we know it is in a completely different collection
    // --> THE POPULATE PROCESS ALWAYS HAPPENS IN QUERY
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
 
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 or -1 ,  1 means we are sorting
// the price index in an ascending order while -1 for desending order

tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // with this we are basically telling 
// MONOGODB , location here should be indexed to 2D sphere , Eartlike sphere where
// all our data are located 

// MONGODB supports GeoSpatial data , -> GEOSPECIAL data is basically the data
// that describes the places on Earth using longitude and latitude coordinates

// it is a business logic so we write this in model
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
}); // we define get method just this
//virtual property will be crrated each time that we get the data out of
// the data base

// --> We type the name of the virtual field ('reviews') and then an object of some options <--

//  " VIRTUAL POPULATE "
tourSchema.virtual('reviews', {
  // first one is the name of the model that we want to reference
  ref: 'Review', // now we actually need to specify the name of the fields inorder to connect the two datasets
  foreignField: 'tour',
  localField: '_id',
  // Here we need to specify TWO FIELDS , the [ FORIEGN FIELD ] and
  // the [ LOCAL FIELD ] , FORIEGN FIELD is the name of the field in the other model
  // so in the review model in this case , where the reference to the current model is stored
  // that is in this case is tour field where the reference to the current
  // model is stored, in a review model we have a field called tour and so this is
  // where the ID of the tour is being stored and that's why in the foreign field
  // we specify that name of that field in order to connect these two models, and now
  // we need to do the same in the current model , so we ned to say where that ID
  // basically stored here in this current tour model (_id) this underscore id
  // which is how it is called in the local model is called tour in the foreign model
  // in the review model , so this is how we connect these two models together
  // now we can actually use POPULATE just like we did before ,
  // we wan to populate when we only get one single tour
});

// 4 types of MIDDLEWARE in MONGOOSE--> DOCUMENT, QUERY, AGGREGATE, MODEL
// DOCUMENT MIIDLEWARE is the middleware that can act on currently
//processing document , we define milldeware in Schema

// DOCUMENT MIDDLEWARE: runs before .save() and .create() only for save and create this
// middleware is executed
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); // in a save middleware this keyword here is gonna point
  // to the currently processed document , that is the reason it is called
  // DOCUMENT MIDDLEWARE because we have access the document that is being processed
  // so in this case that is being saved
  next();
}); // this middleware we call it pre save HOOK

/*.pre('save', async function (next) {
  // we got this.guides as an input , thisi is gonna be an array of
  // al the user ids, so we will loop through them using map
  // and then in each iteration get the user documents for the current ID

  const guidesPromises = this.guides.map(async (id) => User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  // we get  a problem because map method will assign the result of each
  // iteration to the new element in the guides array , so we have an asynchronus
  // function that returns a promise , (this guide array is basically an array
  // full of Promises ), we can directly assign the result of this to this.guide
  // basically OverRide that template array of IDS with an array of user documents
// REMEMBER -> we need to use Promis.all because the result of all of this (line 163) 
// here is a PROMISE, so this array is gonna be full of Promises , then which we are 
//awaiting Promises.all , so the result will be these are the complete documents
  next(); // so this is how we could implement embedding for this toyr guide example
}); */

/* tourSchema.post('save', function (doc, next) {
   in here er don't have no longer this keyword, but instead
   we have basically finished document
  console.log(doc);
  next();
});*/

// QUERY MIDDLEWARE ---> QUERY Middleware allows us to run the functions , before or
//after certain query is executed
tourSchema.pre(/^find/, function (next) {
  // this find here is  making it query MIDDLEWARE
  // gonna run before any
  // query is executed
  // now the this keyword now will point at the current query not at the current document
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// USING query Middleware to populate, we do this in query middleware
// well because this is the kind of middleware that is going to run each
// time there is a query
tourSchema.pre(/^find/, function (next) {
  // this always points the current query. and now so basically
  // all the queries will then automatically populate the guides field
  // with the referenced user
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  // we are doing it here instead of doing in two places in the
  // controller , this is the nice little trick in case that you
  // always want to populate all your documents
  // this is two step process, first you create a reference to another model
  // and so with this you effectively create relationship
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  // this MIDDLEWARE is gonna runs after the query has already executed
  // therefrore it can have access tot the document that we returned
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);

  next();
});

// AGGREGATION MIDDLEWARE --> allow us to add hooks before or after an aggregation happens
/*tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline()); // this is pointing here on current aggregation object
  next();
});*/

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

// our LOCATION data will actcually be embedded into the tours
// We are gonna declare everything that is related to location
// into our tourModel

// HOW IN PRACTICE WE ACTUALLY WANT TO CREATE A NEW REVIEW ?
//  when creating new Reviews we always manually passed the tour ID
// and the user ID to the request body and then created the review
// form there that's ok in development, but that's not how a review
// will be created in the real world, so in the real world
// the user Id should ideally come from the current logged in user
// and the tour is should come from the current tour
// and that should ideally be encoded right in the route
// -> SO WHEN SUBMITTING A POST REQUEST FOR A NEW REVIEW
// we will want to submit that to a URL like this

// POST /tour/2345ad4r/reviews  -> we will request for POST
// tour and then the id of the tour and then reviews
// and so just like this we have the tour ID right in the URL
// and the user id will also come from the current logged in user
// and so now se see here is now a so called a " [NESTED ROUTE] "
// and they make a lot of sense when there is a clear PARENT CHILD
// relationship between the resources and that is clearly the case here ,
// reviews is clearly a child of tours , so this nested route basically means
// to access the review resourse on the tour's resourse ,
// in the same way we will actually also want to acess reviews from a
// certain tour in the same way
// GET /tour/234rta46/reviews
// this would then ideally get us all the reviews to this reviews
// and we could go even further and also specify the id of the review
// GET /tour/234rta46/reviews/56niar435q  in this case we would get a review
// with the id of this here on the tour with this id
// so this is what nested route all about , and this is a more easiest way
// of reading and understanding how the API works for our API users
