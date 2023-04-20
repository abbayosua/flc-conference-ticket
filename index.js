require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require('path');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const fs = require('fs');
const formidable = require('formidable');
const FormData = require('form-data');
const axios = require('axios');
const requestIP = require('request-ip');
const ExcelJS = require('exceljs');

const app = express();
const port = process.env.PORT || 3000;
const localURL = process.env.LOCAL_URL || 'http://localhost:3000'
const mongoAtlasUri = process.env.MONGO_ATLAS;

app.set("view engine", "ejs");

mongoose.connect(mongoAtlasUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to database!");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.render('index');
});


const userSchema = new mongoose.Schema({
  user_number: Number,
  email: String,
  full_name: String,
  born_date: String,
  city: String,
  phone_number: String,
  position_at_church: String,
  tshirt_size: String,
  blazer_size: String,
  profile_picture: String,
  quotes_words: String,
},
);

const User = mongoose.model("FLCTicket", userSchema);

app.get("/", function(req, res) {
  res.render("index");
});

app.post('/register', async function(req, res) {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) throw err;

      const file = fields.profile_picture;
      const base64Image = file;

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

          const userCount = await User.countDocuments();


          const user = new User({
            user_number: userCount + 1,
            email: fields.email,
            full_name: fields.full_name,
            born_date: fields.born_date,
            city: fields.city,
            phone_number: fields.phone_number,
            position_at_church: fields.position_at_church,
            tshirt_size: fields.tshirt_size,
            blazer_size: fields.blazer_size,
            profile_picture: response.data.image.url,
            quotes_words: fields.quotes_words
          });

          const savedUserData = await user.save();

          res.redirect("/tagname/" + user.id);
          try {
            const response = await axios.post('https://wa-openai.fahrizal91238.repl.co/sendwhatsapp', {
              number: fields.phone_number,
              msg: `Selamat anda sudah terdaftar di School of Prophet 2023! \n\n Berikut link tagname anda yang bisa anda download sekarang!\n ${localURL}/tagname/${user.id}\n\nUntuk edit data anda bisa klik link berikut:\n${localURL}/members/${user.id}`
            });
            console.log(response);
          } catch (error) {
            console.error(error);
          }

          await sendMail(
            fields.email,
            "Registration Successful",
            "./views/emailTemplate.ejs",
            { user: savedUserData, localURL }
          );


        })
        .catch((error) => {
          console.error(error);
          res.status(500).send({ error: 'Internal server error' });
        });
    });

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

app.get('/users', async function(req, res) {
  const users = await User.find();
  res.render('superuser', { users });
});

app.get('/delete-all', async function(req, res) {
  await User.deleteMany();
  res.render('deleted');
});

app.get('/edit/:id', async function(req, res) {
  const user = await User.findById(req.params.id);
  res.render('edit', { user });
});

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


app.get('/memberedit/:id', async function(req, res) {
  const user = await User.findById(req.params.id);
  res.render('memberedit', { user });
});

app.post('/memberedit/:id', async function(req, res) {
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
  res.redirect(`/members/${user.id}`);
});

app.get('/new', function(req, res) {
  res.render('new');
});

app.get('/supermenu', function(req, res) {
  res.render('supermenu');
});

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

app.post('/delete/:id', async function(req, res) {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/users');
});

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

app.use('/api/uptime', require('express-healthcheck')({
  healthy: serverStatus
}));

app.get('/exceldownload/:filename', async (req, res) => {
  const filename = req.params.filename;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  worksheet.columns = [
    { header: 'User Number', key: 'user_number', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Full Name', key: 'full_name', width: 30 },
    { header: 'Born Date', key: 'born_date', width: 15 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'Phone Number', key: 'phone_number', width: 15 },
    { header: 'Position at Church', key: 'position_at_church', width: 20 },
    { header: 'T-Shirt Size', key: 'tshirt_size', width: 15 },
    { header: 'Blazer Size', key: 'blazer_size', width: 15 },
    { header: 'Profile Picture', key: 'profile_picture', width: 30 },
    { header: 'Quotes Words', key: 'quotes_words', width: 40 },
  ];

  const users = await User.find();

  users.forEach(user => {
    worksheet.addRow(user);
  });

  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await workbook.xlsx.write(res);
});

app.listen(port, function() {
  console.log("Server started on port " + port);
});