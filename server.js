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


// Set up multer storage for file uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads');
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });
// const upload = multer({ storage: storage });

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


app.post('/register',
  // upload.single('profile_picture'),
  async function (req, res) {
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

    // let externalImageUrl

    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      // handle file upload
      console.log(files)
      const file = files.profile_picture;
      // const filePath = file.path;
      const fileData = fs.readFileSync(file.filepath);
      const base64Image = Buffer.from(fileData).toString('base64');

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
          password: fields.password,
          full_name: fields.full_name,
          born_date: fields.born_date,
          city: fields.city,
          phone_number: fields.phone_number,
          position_at_church: fields.position_at_church,
          tshirt_size: fields.tshirt_size,
          blazer_size: fields.blazer_size,
          profile_picture: response.data.image.url,
          // external_profile_picture: externalImageUrl,
          quotes_words: fields.quotes_word
        });

        // Save user to database
        const savedUserData = await user.save();
        await sendMail(
          fields.email,
          "Registration Successful",
          "./views/emailTemplate.ejs",
          { user: savedUserData, password: fields.password }
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

app.get('/public-ip',function(req, res) {
  const ipAddress = requestIP.getClientIp(req);
  res.send("your IP is: " + ipAddress);
});

// app.get("/whatsapp/:id", async function(req, res) {
//   User.findById(req.params.id)
//   .then(async function(user) {
//     const message = 'silahkan ke ....'
//     await wbm.start({ showBrowser: false });
//     await wbm.send(user.phone_number, message);
//     await wbm.end();
//     res.status(200).json({ message: 'Message sent successfully!' });
//     res.render("whatsapp", { user });
//   })
//   .catch(function(err) {
//     console.log(err)
//   });
// });


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