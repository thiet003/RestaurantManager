// Import libraries
const express = require('express');
const app = express();
const pool = require('./databases/connect_to_postgre');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Import routes
const dishRoute = require('./routes/dish.route');
const employeeRoute = require('./routes/employee.route');
// Router
app.use('/api/v1/dishes', dishRoute);
app.use('/api/v1/employees', employeeRoute);
app.get('/', (req, res) => {
    res.send('Hello World');
});
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});