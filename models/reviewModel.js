// CREATING REVIEW MODEL

// review / rating / CreatedAt / ref to tour (that this review belongs to ) / ref to user (who wrote this review)
// so basically two parent references here
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty '],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
      // just like this, each Review document now know exactly what tour it belongs to
      // while the tour ofcourse does not know initially
      // what reviews and how many Reviews there are (Solve it later)
      // next up when there is a reivew we are not only want to know
      // what tour it belongs to but also who wrote this review
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review mut belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }, // all this does is to really
    // make sure that when we have a virtual property basically a
    // field that is not stored in the database but calculated using
    // some other value , well beacuse that's what we specified there
    // so the reference to a model called tour , it is in that collection
    // where MONGOOSE is then going to look for documents with the ID that
    // we specified
  }
);

// ----> DUPLICATE REVIEW
// DUPLICATE REVIEW happens when there is a review
// with the same user and the same tour Id , and that's what we want to avoid from happening
// we want the combination of user and tour to be
// always unique that is very wasy to achieve with indexes

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
// this will achieve exactly what we want now each combination
// of tour and user has always to be unique 
// we wll no be able to create new reviews coming from the same user 

reviewSchema.pre(/^find/, function (next) {
  /*this.populate({
    path: 'tour', // by specifying tour here means this tour field in Schema
    // which has exact the same name is then going to be the one that's populated
    // based on the tour model
    select: 'name',
  }).populate({
    path: 'user',
    select: 'name photo',
  }); // if we want to populate multiple fields, well all we need
  // to do is to call populate again , at this point query is populated with
  // the tours and now we need to populate it again this time with the user
*/

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
}); // at this point we have populated the reviews with the tour and the
// user data right here , and right now when we query for reviews
// we get access to that information, HOWEVER that still leaves one problem
// unsolved , how are we going to access reviews on the tours?
// basically the other way round , so let's say I query for the specific tour
// and then how will I get access to all the reviews for that tour ,
// this problem arises here because we did PARENT REFERENCING on the reviews
// so basically, having the reviews pointing to the tours and not the tours
// pointing to the reviews ,and as we know that parent does not know about his children
// and so in this example (tour does not know about its reviews ) and sometimes
// its okay but in this case we actually want the tour to basically know about
// all reviews that it is got
// INOREDER TO SOLVE THIS -> also do child referencing on the tours
// so basically keep an array of all the review ID's on each tour document
// then all we have to do is to populate that array , but we actually ruled out doing this
// right in the beginning because we do'nt want to store that array of review ID'S
// that could then grow indefinitely in our database and that actually why we pick
// parent referencing at the first place , HOWEVER THERE IS A GREAT SOLUTION
// FOR THIS -> and that's MONGOOSE actually offers us a very nice solution
// for this problem with a pretty advanced feature called ["VIRTUAL-POPULATE"]
//so with VIRTUAL POPULATE we can actually populate the tour with the reviews
//means we can get access to all the reviews for a certain tour but with out
// keeping that array of id in the tour
// so think of VIRTUAL POPULATE like a way of keeping that array of review ID's
// on a tour but without actually persisting it to the database so that then solve
// the problem that we have with child referncing, we do this in tour schema
// ---------------------------------------------------------------------------//

// here is basical;y creating a kind of problem , beacue this basically
// creating a chain of populates and that's not ideal at all, so we have the tour that
// is being populated with reviews but then the reviews also get populated
// with the tour again and also with the user , and tour is also get populated with
// the guides , so here we have a chain of three populates
// and for performance that is not ideal at all , espaecially with the tour
// we have the tour populated with the reviews ,and in the reviews, we again
// have the data about the tour so it does not make sense at all ,it's kind of
// a mess now , so the solution we are doing here is actually turn Off populating
// the reviews with the tours , in this app it is more logical to really
// have the reviews available on tours, and it's not that important , having a
// tour avaialbe on the review,
// what this ofcourse we still do parent referencing, we still keep the erefernce to the
// tours here , but simply we do not populate it because we always don't need that
// data right here
// RECAP -> we started doing only parent referencing on the review but that meade it so
// that on the tours we had no access to its corresponding reviews and the easiest fix
// of that would be to also do the child referencing on the tours , but the problem
// with that would be we do not actually want to keep an array of all the child
// documents on the parent document, because we do'nt want to allow arrays
// to grow indefinitely so instead of doing that we implemented VIRTUAL POPULATES
// and this allow us to do exactly the same thing so keeping the refernce to
// all the child documents on the parent document but with out actually persisting
// that information to the database and then after that virtual populate setup
// all we need to do isto use populate just like we did before with the real references
// and then we also turned off one of the populate that we had on the review ,
// because that was creating inefficient chain of populates

//---------------------------------------------------------//

// we are gonna create a new function which will take in a tour ID
// and calculate the average rating and the number of ratings
// that exist in our collection for that exact tour
// we are gonna use STATIC METHOD this can be called on the document
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this Id is ofcourse fot the tour to which the
  // current review belongs to, inorder to do the
  // calculation we will again use the aggregation pipeline
  // in static model (this) keyword actually
  // points to the current Model
  const stats = await this.aggregate([
    // first step should be to select all the reviewa
    // that actually belong to the current tour
    // that was passed in as the argument , so ot 1st stage is match stage
    {
      $match: { tour: tourId }, // like this we only select a tour
      // that we actually want to update
    },
    {
      $group: {
        // at group stage first field that we need to specify
        // is the id , and then the common field
        // that all of the document have in common
        // that we want to group by and so that's again gonna be tour
        _id: '$tour',
        nRating: { $sum: 1 }, // all we do isto basically add one
        // for each tour that we have , each tour that was matched
        // in the previous step, so if there are five riviews
        // documents for the current tour , then for each of these documents
        // one will get added , so then in the end number of ratings
        // will be five
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats); // in later step we actually
  // want to then update the tour document with these statistics
  // will do that a bit later , because now we need
  // to call this method somewhere , because otherwise
  // this statistics will never be called , and we will do this using
  // MIDDLEWARE each time that a new review is created

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
}; // THE ENTIRE FUNCTION basically create the
// statistics of the average and number of ratings
// for the tourId, for which the current review was created
// and we created this function as a static method
// because we need to call the aggregate function on the MODEL
// we call this fun after the new review is created

reviewSchema.post('save', function () {
  // in this kind of MIDDLEWARE ,(this) keyword points to the document
  // that is currently being saved
  // this points to current review, we have to call
  // this method at model

  this.constructor.calcAverageRatings(this.tour);

  // so (this) here still points to the model
  // so basically again. this is the current document and constructor
  // is basicalyy the model who created the document , here stands for the tour
});

// keep in mind that the review is updated or deleted
// using findByIdAndUpdate or also findByIdAndDelete
// and for these we actually do not have document MIDDLEWARE
// but only query MIDDLEWARE , and so in the query
// actually do not have direct access to the document
// in order to then do something , because we need access
// to the current review so that from there , we can extract the tourId
// and then calculate the statistics from there but for these hooks
// we only do have a query MIDDLEWARE,but WE HAVE A NICE TRICK
// to go around this limitation, we are going to implement
// pre Middleware for these events
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // the goal is to access to the current review document
  // but here the (this) keyword is the current query ,
  // well we can execute the query and that will give us
  // the document  that currently being processsed
  this.r = await this.findOne(); // this findOne gets the data from the database
  //console.log(this.r);   without any calculations
  // we are interseted in if this nice tricks work, this trick is for going around
  // that in a query MIDDLEWARE, we have only access to the query
  // we need to get access to the document and so we execute this query //await this.findOne()
  // by using findOne
  // we use this.r to passing the data from pre middleware
  // to the post middleware and so then in post we retrieve the review document
  // from this variable
  next();
}); // this then going to
// work for findOneAndUpdate and findOneAndDelete
// because remember that behind the scenes findByIdAndUpdate
// is only just a shorthand for findOneAndUpdate with the current ID
// so here we actually need to use the findOneUpdate and findOneDelete middleware hoks

reviewSchema.post(/^findOneAnd/, async function () {
  // now at this point of time after the query is finished and so therefore the review has been updated
  // this is the perfect point in time where we can then call this function calcAvgRating
  // but where do we now get the tour Id from?
  // we are gonna use the trick which is basically to pass data
  // from the pre middleware to the post MIDDLEWARE
  // await this.findOne(); does NOT work here , query has already executed
  // so in pre middleware (above) so instead of saving the document
  // in the simple variable , we are gonna save to
  // this.r so basically we create a property on this variable
  // so now here we still have access to that

  await this.r.constructor.calcAverageRatings(this.r.tour);
});
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// --> Now comes for the reference part
// review ofcourse needs to belong to a tour and it also needs an author
// basically we are gonna implement PARENT REFERNCING in this case
// because the both tour and the user are in a sence the parents of this data set
// so turning off this populate
