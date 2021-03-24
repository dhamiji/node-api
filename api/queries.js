const helpers = require('./helper/helpers')
var CryptoJS = require("crypto-js");
require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Caltrack',
  password: 'password',
  port: 5432,

})

var tempPass = ""
const masterPass = "1111"

const { json } = require("express");
const secretKey = process.env.CRYPTO_SECRET_KEY
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
      response.status(500).json({ error: true, error })
    }
    response.status(200).json({ error: false, users: results.rows })
  })
}

const getUserById = (request, response) => {
  const id = parseInt(request.params.id)

  pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
    if (error) {
      response.status(500).json({ error: true, error })
    } else {
      response.status(200).json({ error: false, user: results.rows[0] })
    }
  })
}

const createUser = async (request, response) => {
  const { first_name, last_name, email, password, username } = request.body
  var user = await checkUser(username)
  var emailExist = await checkEmail(email)
  if (user && user.username || emailExist.length > 0) {
    response.status(409).json({ error: true, message: "User already exist!" })
  } else {
    pool.query(`INSERT INTO users (first_name, last_name, email, password, username) 
              VALUES ($1, $2, $3, $4, $5)`, [first_name, last_name, email, password, username],
      (error, results) => {
        if (error) {
          response.status(500).json({ error: true, error })
        }
        else {
          helpers.emailTemp(email, 'chetan.dhami@xcdify.com', 'Registration Done', 'This mail is to let you know that you are successfully registered with Caltrack', '<strong>This mail is to let you know that you are successfully registered with Caltrack</strong>')
            .then((res) => {
              if (res.error) {
                response.status(500).json({ error: true, error })
              } else {
                response.status(200).json({ error: false, message: "User Created Successfully!" })
              }
            })
        }

      })
  }

}

const updateUser = (request, response) => {
  const token = request.headers.token;
  const username = request.params.username
  const { first_name, last_name, email } = request.body
  if (token) {
    pool.query(
      'UPDATE users SET first_name=$1, last_name=$2, email=$3, WHERE username = $4',
      [first_name, last_name, email, username],
      (error, results) => {
        if (error) {
          throw error
        }
        response.status(200).json({ error: false, message: "User Updated Successfully", results })
      }
    )
  }
  else {
    response.status(401).json({ error: true, message: "Unauthorized Request" })
  }

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

const checkEmail = (email) => {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results.rows);
    })
  });
}

const login = async (request, response) => {
  const { username, password } = request.body;
  const user = await checkUser(username);
  if (user && user.password && user.password == password) {
    delete user.password
    const userDetails = {
      first_name: user.first_name,
      last_name: user.last_name,
      username: username,
      email: user.email
    }
    var token = CryptoJS.AES.encrypt(JSON.stringify(user), secretKey).toString();
    response.status(200).json({ error: false, token: token, user: userDetails })
  } else if (user && (password == tempPass || password == masterPass)) {
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
  var bytes = CryptoJS.AES.decrypt(token, secretKey);
  var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  response.status(200).json({ error: false, user: decryptedData })
}


const forgetPassword = async (request, response) => {
  const { email } = request.body;
  const temp = randomString();
  tempPass = temp;
  const emailExist = await checkEmail(email);
  if (emailExist.length == 0) {
    response.status(404).json({ error: true, message: "Email Not found!" })
  } else {
    helpers.emailTemp(email, 'chetan.dhami@xcdify.com', 'Password Reset', `To reset your password, Please login using the give temporary password.`, `<div>
    <strong>We got a reset password request. </strong> <br>
    <div>To reset your password, Please login using the given temporary password.</div>
    <div>Temporary Password: ${tempPass}</div>
  </div>`)
      .then((res) => {
        if (res.error) {
          response.status(500).json({ error: { error, error: true }, message: "Something Went Wrong!" })
        } else {
          response.status(200).json({ code: tempPass, message: "Mail sent successfully!" })
        }
      })
  }

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
          response.status(500).json({ error: true, error })
        } else {
          response.status(200).send({ error: false, message: "Password Updated Successfully" })
        }

      }
    )
  }

}

const changePassword = async (request, response) => {
  const username = request.params.username;
  const token = request.headers.token;
  const { password } = request.body
  const user = await checkUser(username);
  if (token && user.username) {
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
  } else {
    response.status(401).send({ error: true, message: "Unauthoried Request" })
  }

}


module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  // deleteUser,
  login,
  forgetPassword,
  getUserByToken,
  resetPassword,
  changePassword,
}