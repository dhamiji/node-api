const Pool = require('pg').Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Caltrack',
  password: 'password',
  port: 5432,

})

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey("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")


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

const createUser = (request, response) => {
  const { first_name, last_name, email, password, username } = request.body

  pool.query('INSERT INTO users (first_name, last_name, email, password, username) VALUES ($1, $2, $3, $4, $5)', [first_name, last_name, email, password, username], (error, results) => {
    if (error) {
      response.send(`User Already Exists`)
      throw error
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

        })
        .catch((error) => {
          console.error(error)
        })
      response.status(201).send(`User added with ID: ${results}`)
    }

  })
}

const updateUser = (request, response) => {
  const id = parseInt(request.params.id)
  const { name, email } = request.body

  pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3',
    [name, email, id],
    (error, results) => {
      if (error) {
        throw error
      }
      response.status(200).send(`User modified with ID: ${id}`)
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

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
}