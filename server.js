const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const fs = require('fs');

const app = express();
const port = 3000;

app.set("view engine", "ejs");

const mongoAtlasUri = "mongodb+srv://abbasiagian:123qwe123qwe@abbamongodb.aeahuus.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(mongoAtlasUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
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


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    full_name: String,
    born_date: Date,
    city: String,
    phone_number: String,
    position_at_church: String,
    tshirt_size: String,
    blazer_size: String,
    profile_picture: String,
    quotes_words: String,
});

const User = mongoose.model("FLCTicket", userSchema);

app.get("/", function(req, res) {
  res.render("index");
});


app.post('/register', upload.single('profile_picture'), async function (req, res) {
  // const { username, password, email, fullName, bornDate, city, phoneNumber, tShirtSize } = req.body;
  // const profilePicture = req.file ? req.file.path : '';

  try {
    // Check if email already exists
    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   return res.status(400).send({ error: 'email already exists' });
    // }

    // Hash password
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const user = new User({
      email: req.body.email,
      password: req.body.password,
      full_name: req.body.full_name,
      born_date: req.body.born_date,
      city: req.body.city,
      phone_number: req.body.phone_number,
      position_at_church: req.body.position_at_church,
      tshirt_size: req.body.tshirt_size,
      blazer_size: req.body.blazer_size,
      profile_picture: req.file.path,
      quotes_words: req.body.quotes_word
    });

    // Save user to database
    const savedUserData = await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '1741230080@student.polinema.ac.id',
        pass: '12345w@h'
      }
    });


    console.log(`test ${req.body.profile_picture}`)
    const sendMail = async (toEmail, subject, templatePath, data) => {
      try {
        const emailTemplate = ejs.compile(
          fs.readFileSync(path.resolve(__dirname, templatePath), "utf8")
        );
        const html = emailTemplate(data);
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: toEmail,
          subject,
          html,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${toEmail}`);
      } catch (error) {
        console.error(`Error sending email to ${toEmail}`, error);
      }
    };

    // Usage example
    sendMail(
      req.body.email,
      "Registration Successful",
      "./views/emailTemplate.ejs",
      { user: savedUserData, password: req.body.password }
    );

    // const dataToEmail = req.body

    // ejs.renderFile(path.join(__dirname, 'views', 'emailTemplate.ejs'), { user: dataToEmail }, (err, data) => {
    //   if (err) {
    //     console.log(err);
    //     res.render('index', { message: 'Error sending email' });
    //   } else {
    //     const mailOptions = {
    //       from: 'your_email@gmail.com',
    //       to: dataToEmail.email,
    //       subject: 'Welcome to our website!',
    //       html: data
    //     };

    //     transporter.sendMail(mailOptions, (err, info) => {
    //       if (err) {
    //         console.log(err);
    //         res.render('index', { message: 'Error sending email' });
    //       } else {
    //         console.log('Email sent: ' + info.response);
    //         res.render('index', { message: 'User registered and email sent' });
    //       }
    //     });
    //   }
    // });

    // Redirect to login page
    // res.redirect('/login');
    res.redirect("/tagname/" + user.id);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

app.get("/members/:id", function(req, res) {
  User.findById(req.params.id)
  .then(function(user) {
    res.render("member", { user });
  })
  .catch(function(err) {
    console.log(err)
  });
});

app.get("/tagname/:id", function(req, res) {
  User.findById(req.params.id)
  .then(function(user) {
    res.render("tagName", { user });
  })
  .catch(function(err) {
    console.log(err)
  });
});

app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  res.sendFile(filepath);
});

const serverStatus = () => {
  return {
     state: 'up',
     dbState: mongoose.STATES[mongoose.connection.readyState]
  }
};
//  Plug into middleware.
app.use('/api/uptime', require('express-healthcheck')({
  healthy: serverStatus
}));

app.listen(port, function() {
  console.log("Server started on port " + port);
});