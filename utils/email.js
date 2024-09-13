const nodemailer = require('nodemailer'); // to send email using NodeJS

// EMAIL HANDLER FUNCTION
const sendEmail = async (options) => {
  // we have to perform three steps inorder to send email with nodemailer

  // 1) CREATE A TRANSPORTER
  // Transporter that we made in 1st step
  //  is basically a service that will actually send the email
  // because it is not NODE js that will actually sends email
  // it's a service that we define just here
  // we gonna use special development service which basically fakes
  // to send email to real addresses, but in reality , these emails
  // end up trapped in a development inbox ..-> That service is called mailtrap
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,

    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  //2) Define the email options
  // defining some options for email

  const mailOptions = {
    from: 'Faizan <faizan@user.io>',
    to: options.email, // coming as an argument to the function
    subject: options.subject,
    text: options.message,
  };

  //3) Actually send the email
  await transporter.sendMail(mailOptions); // this actually returns a promise
};

module.exports = sendEmail;
