const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
// const wbm = require('wbm');
const ejs = require('ejs');
const fs = require('fs');
const formidable = require('formidable');
const FormData = require('form-data');
const axios = require('axios');
const requestIP = require('request-ip');

const app = express();
const port = 3000;

app.set("view engine", "ejs");

const mongoAtlasUri = "mongodb+srv://abbasiagian:123qwe123qwe@abbamongodb.aeahuus.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(mongoAtlasUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up static directory for serving images
app.use(express.static('public'));

// Set up routes
app.get('/', function(req, res) {
  res.render('index');
});


const userSchema = new mongoose.Schema({
  email: String,
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


app.post('/register',
  async function(req, res) {

    try {
      const form = new formidable.IncomingForm();
      form.parse(req, (err, fields, files) => {
        // handle file upload
        console.log(files)
        const file = fields.profile_picture;
        const base64Image = file;
        console.log(base64Image)

        const formData = new FormData();
        formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
        formData.append('action', 'upload');
        formData.append('source', base64Image);
        formData.append('format', 'json');
        axios({
          method: "post",
          url: "https://freeimage.host/api/1/upload",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        })
          .then(async (response) => {
            console.log(response.data.image.url);

            // Create user object
            const user = new User({
              email: fields.email,
              full_name: fields.full_name,
              born_date: fields.born_date,
              city: fields.city,
              phone_number: fields.phone_number,
              position_at_church: fields.position_at_church,
              tshirt_size: fields.tshirt_size,
              blazer_size: fields.blazer_size,
              profile_picture: response.data.image.url,
              quotes_words: fields.quotes_word
            });

            // Save user to database
            const savedUserData = await user.save();
            await sendMail(
              fields.email,
              "Registration Successful",
              "./views/emailTemplate.ejs",
              {
                user: savedUserData,
              }
            );

            res.redirect("/tagname/" + user.id);
          })
          .catch((error) => {
            console.log(error);
          });

      })


      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '1741230080@student.polinema.ac.id',
          pass: '12345w@h'
        }
      });


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


// Add a route that displays the list of users
app.get('/users', async function(req, res) {
  const users = await User.find();
  res.render('superuser', { users });
});

// Add a route that deletes all users
// app.post('/delete-all', async function(req, res) {
//  await User.deleteMany();
//  res.redirect('/users');
// });

// Add a route that displays a form to edit a user
app.get('/edit/:id', async function(req, res) {
  const user = await User.findById(req.params.id);
  res.render('edit', { user });
});

app.get('/memberedit/:id', async function(req, res) {
  const user = await User.findById(req.params.id);
  res.render('memberedit', { user });
});

// Add a route that updates a user's information
app.post('/edit/:id', async function(req, res) {
  const user = await User.findById(req.params.id);
  user.email = req.body.email;
  user.full_name = req.body.full_name;
  user.born_date = req.body.born_date;
  user.city = req.body.city;
  user.phone_number = req.body.phone_number;
  user.position_at_church = req.body.position_at_church;
  user.tshirt_size = req.body.tshirt_size;
  user.blazer_size = req.body.blazer_size;
  user.quotes_words = req.body.quotes_words;
  await user.save();
  res.redirect('/users');
});

// Add a route that displays a form to add a new user
app.get('/new', function(req, res) {
  res.render('new');
});

// Add a route that creates a new user
app.post('/new', async function(req, res) {
  const user = new User({
    email: req.body.email,
    full_name: req.body.full_name,
    born_date: req.body.born_date,
    city: req.body.city,
    phone_number: req.body.phone_number,
    position_at_church: req.body.position_at_church,
    tshirt_size: req.body.tshirt_size,
    blazer_size: req.body.blazer_size,
    profile_picture: req.body.profile_picture,
    quotes_words: req.body.quotes_words
  });
  await user.save();
  res.redirect('/users');
});

// Add a route that deletes a user
app.post('/delete/:id', async function(req, res) {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/users');
});

// Render the EJS file for the user interface
app.get('/superuser', function(req, res) {
  res.render('superuser');
});


app.get('/listmembers', async function(req, res) {
  try {
    const users = await User.find();
    res.render('users', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Internal server error' });
  }
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

app.get('/public-ip', function(req, res) {
  const ipAddress = requestIP.getClientIp(req);
  res.send("your IP is: " + ipAddress);
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