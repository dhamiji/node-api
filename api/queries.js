// import sha256 from 'crypto-js/sha256';
// import hmacSHA512 from 'crypto-js/hmac-sha512';
// import Base64 from 'crypto-js/enc-base64';

// const message, nonce, path, privateKey; // ...
// const hashDigest = sha256(nonce + message);
// const hmacDigest = Base64.stringify(hmacSHA512(path + hashDigest, privateKey));
// var AES = require("crypto-js/aes");
// var SHA256 = require("crypto-js/sha256");
var CryptoJS = require("crypto-js");
const { Pool } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Caltrack',
  password: 'password',
  port: 5432,

})

var tempPass = ""

const sgMail = require('@sendgrid/mail');
const { json } = require("express");
sgMail.setApiKey("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")

const randomString = () => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < 7; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const getUsers = (request, response) => {
  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const getUserById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
}

const createUser = async (request, response) => {
  const { first_name, last_name, email, password, username } = request.body
  var user = await checkUser(username)
  if (user.username) {
    response.status(409).json({ error: true, message: "Username already exist!" })
  } else {
    pool.query(`INSERT INTO users (first_name, last_name, email, password, username) 
              VALUES ($1, $2, $3, $4, $5)`, [first_name, last_name, email, password, username],
      (error, results) => {
        if (error) {
          response.status(500).send(error)
        }
        else {
          const msg = {
            to: email, // Change to your recipient
            from: 'chetan.dhami@xcdify.com', // Change to your verified sender
            subject: 'Registration Done',
            text: 'This mail is to let you know that you are successfully registered with Caltrack',
            html: '<strong>This mail is to let you know that you are successfully registered with Caltrack</strong>',
          }
          sgMail
            .send(msg)
            .then(() => {
              console.log('Email sent')
              response.status(200).json({ error: false, message: "User Created Successfully!" })
            })
            .catch((error) => {
              response.status(500).send(error)
            })

        }

      })
  }

}

const updateUser = (request, response) => {
  const username = parseInt(request.params.username)
  const { first_name, last_name, email } = request.body

  pool.query(
    'UPDATE users SET first_name=$1, last_name=$2, email=$3, WHERE username = $4',
    [first_name, last_name, email, username],
    (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).send(`User modified with ID: ${username}`)
    }
  )
}

const deleteUser = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).send(`User deleted with ID: ${id}`)
  })
}

const checkUser = (username) => {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE username = $1', [username], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results.rows[0]);
    })
  });
}

const login = async (request, response) => {
  const { username, password } = request.body;
  const user = await checkUser(username);
  if (user && user.password && user.password == password) {
    var token = CryptoJS.AES.encrypt(JSON.stringify(user), 'secret key 123').toString();
    response.status(200).json({ error: false, token: token })
  } else if (user && password == tempPass) {
    response.status(200).json({ error: false, message: "Success", username: username })
  } else if (user && user.password && user.password != password) {
    response.json({ error: true, message: "You've entered a wrong password!" })
  }
  else {
    response.json({ error: true, message: "User does not exist!" })
  }
}

const getUserByToken = async (request, response) => {
  const { token } = request.headers;
  var bytes = CryptoJS.AES.decrypt(token, 'secret key 123');
  var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  response.status(200).json({ error: false, user: decryptedData })
}


const forgetPassword = async (request, response) => {
  const { email } = request.body;
  const temp = randomString()
  tempPass = temp;
  const msg = {
    to: email, // Change to your recipient
    from: 'chetan.dhami@xcdify.com', // Change to your verified sender
    subject: 'Password Reset',
    text: `To reset your password, Please login using the give temporary password.`,
    html: `<div>
      <strong>To reset your password, Please login using the give temporary password.</strong>
      <div>${tempPass}</div>
    </div>`,
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent')

    })
    .catch((error) => {
      console.error(error)
    })
  response.json({ code: tempPass, message: "Mail sent successfully!" })
}

const resetPassword = async (request, response) => {
  const username = request.params.username
  const { password } = request.body
  const user = await checkUser(username);
  if (user.username) {
    pool.query(
      'UPDATE users SET password=$1 WHERE username = $2',
      [password, username],
      (error, results) => {
        if (error) {
          response.status(500).send(error)
        } else {
          response.status(200).send({ error: false, message: "Password Updated Successfully" })
        }

      }
    )
  }

}


module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
  forgetPassword,
  getUserByToken,
  resetPassword,
}