const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const app = express();

// Set up mongoose connection
const mongoAtlasUri = 'mongodb+srv://abbasiagian:123qwe123qwe@abbamongodb.aeahuus.mongodb.net/?retryWrites=true&w=majority'
mongoose
  .connect(mongoAtlasUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });



// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up static directory for serving images
app.use(express.static('public'));

// Set up routes
app.get('/', function (req, res) {
  res.render('index');
});

app.post('/register', upload.single('profilePicture'), async function (req, res) {
  const { username, password, email, fullName, bornDate, city, phoneNumber, tShirtSize } = req.body;
  const profilePicture = req.file ? req.file.path : '';

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send({ error: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName,
      bornDate,
      city,
      phoneNumber,
      tShirtSize,
      profilePicture,
    });

    // Save user to database
    await user.save();

    // Redirect to login page
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

app.listen(3000, function () {
  console.log('Server started on port 3000');
});
