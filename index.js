const express = require('express');
const app = express();

const pool = require('./databases/connect_to_postgre');

app.get('/', (req, res) => {
    res.send('Hello World');
});
app.get('/dishs', (req, res) => {
    pool.query('SELECT * FROM dishs', (error, result) => {
        if (error) {
            throw error;
        }
        res.send(result.rows);
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});