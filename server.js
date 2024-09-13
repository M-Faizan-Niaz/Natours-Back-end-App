const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const app = require('./app');



const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    // this connect method gonna returns a promise
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    // a connection object this connection object will be the resolve value of promise
    console.log('DB connection successful..!');
  });

 

//testTour is an instance of Tour model so now it has a couple of methods init, that we can use inorder to connect with our database

// it will then save into tour cllections in the database , we have document instanve testTour
// this save returns a promis that we can consume , here we got the document that we just saved into database




const port = process.env.PORT || 3000;
app.listen(port, (req, res) => { 
  console.log(`App running on port ${port}`);
});

// TEST
