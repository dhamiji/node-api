require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = {
  emailTemp: (recipient, sender, subject, text, html) => {
    return new Promise((resolve, reject) => {
      const msg = {
        to: recipient, // Change to your recipient
        from: sender, // Change to your verified sender
        subject: subject,
        text: text,
        html: html,
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent')
          resolve({ error: false, message: "Success" });
        })
        .catch((error) => {
          return reject({ error: true, message: "Failed" });
        })

    })
  },
}