const express = require('express');
const app = express();
const port = 3000;

// GET / — Returns the original Hello World greeting (preserves backward compatibility)
app.get('/', (req, res) => {
  res.send('Hello, World!\n');
});

// GET /good-evening — Returns a Good evening greeting
app.get('/good-evening', (req, res) => {
  res.send('Good evening');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
