const express = require('express')
const bodyParser = require('body-parser');
const app = express()
const db = require('./queries')
const port = 3000;

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/users', db.getUsers)
app.get('/users/:id', db.getUserById)
app.post('/register', db.createUser)
app.put('/update/:id', db.updateUser)
app.delete('/delete/:id', db.deleteUser)
app.post('/login', db.login)
app.post('/forgetPassword', db.forgetPassword)
app.get('/userByToken', db.getUserByToken)
app.post('/resetPassword/:username', db.resetPassword)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})