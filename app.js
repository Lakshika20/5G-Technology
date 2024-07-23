const express = require('express');
const compression = require('./middleware/compression');
const morgan = require('./middleware/morgan');
const stripRoute = require('./routes/strip');
const homeRoute = require('./routes/home');
const exploreRoute = require('./routes/explore');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.use(compression);
app.use(morgan);
app.use('/', homeRoute);
app.use('/strip', stripRoute);
app.use('/explore', exploreRoute);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});