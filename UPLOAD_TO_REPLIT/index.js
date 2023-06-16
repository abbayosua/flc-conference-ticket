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
const PDFDocument = require('pdfkit');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;
const localURL = process.env.LOCAL_URL || `http://localhost:${port}`
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
      // formData.append('format', 'json');

      axios({
        method: "post",
        url: "https://freeimage.host/api/1/upload",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      })
        .then(async (response) => {

          const userCount = await User.countDocuments();


          // const user = new User({
          //   user_number: userCount + 1,
          //   email: fields.email,
          //   full_name: fields.full_name,
          //   born_date: fields.born_date,
          //   city: fields.city,
          //   phone_number: fields.phone_number,
          //   position_at_church: fields.position_at_church,
          //   tshirt_size: fields.tshirt_size,
          //   blazer_size: fields.blazer_size,
          //   profile_picture: response.data.image.url,
          //   quotes_words: fields.quotes_words
          // });

          // const savedUserData = await user.save();
          const existingUser = await User.findOne({ phone_number: fields.phone_number });
          if (existingUser) {
            existingUser.full_name = fields.full_name;
            existingUser.born_date = fields.born_date;
            existingUser.city = fields.city;
            existingUser.phone_number = fields.phone_number;
            existingUser.position_at_church = fields.position_at_church;
            existingUser.tshirt_size = fields.tshirt_size;
            existingUser.blazer_size = fields.blazer_size;
            existingUser.quotes_words = fields.quotes_words;
            await existingUser.save();
            res.redirect("/tagname/" + existingUser.id);
          } else {
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
              const response = await axios.post('https://flc-whatsapp-responder.abbayosua.repl.co/sendwhatsapp', {
                number: fields.phone_number,
                msg: `Selamat anda sudah terdaftar di School of Prophet FLC 2023 angkatan Pertama!
    Acara akan diadakan pada:
    3-6 Mei 2023
    Tempat : Gedung Unity Lt. 7. Gading Serpong - Tangerang
    
    Maps: Unity Ballroom
    https://maps.app.goo.gl/jxjYDhomC7cc7xaCA?g_st=ic\n
    
    Setiap peserta wajib mendownload dan mencetak kartu nama sendiri pada link di bawah ini. 
    
    ${localURL}/tagname/${user.id}
    
    Jika butuh bantuan silakan hubungi Sekretaris kami. 
    Christina Pakpahan
    081284673785`
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
          }


          // res.redirect("/tagname/" + user.id);

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
  user.user_number = req.body.user_number;
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

// app.get('/download-photos-pdf', async (req, res) => {
//   const doc = new PDFDocument({ size: 'FOLIO' });

//   res.setHeader('Content-Type', 'application/pdf');
//   res.setHeader('Content-Disposition', 'attachment; filename=photos.pdf');

//   doc.pipe(res);

//   try {
//     const profiles = await User.find({}).exec();b

//     const maxRowsPerPage = 6;
//     const maxColsPerPage = 5;
//     const maxPhotosPerPage = maxRowsPerPage * maxColsPerPage;

//     const margin = 10;
//     const photoWidth = (doc.page.width - (margin * (maxColsPerPage + 1))) / maxColsPerPage;
//     const photoHeight = photoWidth * (4 / 3);

//     let currentRow = 0;
//     let currentCol = 0;

//     for (let index = 0; index < profiles.length; index++) {
//       const profile = profiles[index];
//       if (!profile.profile_picture || !profile.full_name) {
//         continue;
//       }

//       const response = await axios.get(profile.profile_picture, { responseType: 'arraybuffer' });
//       const imageBuffer = Buffer.from(response.data);
//       const filePath = path.join(__dirname, `${profile.phone_number}.png`);
//       fs.writeFileSync(filePath, imageBuffer);
//       doc.image(filePath, margin + (currentCol * (photoWidth + margin)), margin + (currentRow * (photoHeight + margin)), { fit: [photoWidth, photoHeight] });
//       fs.unlinkSync(filePath);

//       if (++currentCol >= maxColsPerPage) {
//         currentCol = 0;
//         if (++currentRow >= maxRowsPerPage && index !== profiles.length - 1) {
//           doc.addPage();
//           currentRow = 0;
//         }
//       }

//       if ((index + 1) % maxPhotosPerPage === 0 && index !== profiles.length - 1) {
//         doc.addPage();
//         currentRow = 0;
//         currentCol = 0;
//       }

//       if (index === profiles.length - 1) {
//         doc.end();
//       }
//     }
//   } catch (err) {
//     console.error(err);
//     doc.end();
//     return res.status(500).send('Internal Server Error');
//   }
// });

app.get('/download-photos-pdf', async (req, res) => {
  const doc = new PDFDocument({ size: 'FOLIO' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=photos.pdf');

  doc.pipe(res);

  try {
    const profiles = await User.find({}).exec();

    const maxRowsPerPage = 4;
    const maxColsPerPage = 4;
    const maxPhotosPerPage = maxRowsPerPage * maxColsPerPage;

    const margin = 10;
    const photoWidth = (doc.page.width - (margin * (maxColsPerPage + 1))) / maxColsPerPage;
    const photoHeight = photoWidth * (4 / 3);

    let currentRow = 0;
    let currentCol = 0;

    for (let index = 0; index < profiles.length; index++) {
      const profile = profiles[index];
      if (!profile.profile_picture || !profile.full_name) {
        continue;
      }

      const response = await axios.get(profile.profile_picture, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);
      const filePath = path.join(__dirname, `${profile.phone_number}.png`);
      fs.writeFileSync(filePath, imageBuffer);
      doc.image(filePath, margin + (currentCol * (photoWidth + margin)), margin + (currentRow * (photoHeight + margin)), { fit: [photoWidth, photoHeight] });
      fs.unlinkSync(filePath);

      if (++currentCol >= maxColsPerPage) {
        currentCol = 0;
        if (++currentRow >= maxRowsPerPage && index !== profiles.length - 1) {
          doc.addPage();
          currentRow = 0;
        }
      }

      if ((index + 1) % maxPhotosPerPage === 0 && index !== profiles.length - 1) {
        doc.addPage();
        currentRow = 0;
        currentCol = 0;
      }
    }
    
    // Close and finalize the document after all images have been added
    doc.end();
  } catch (err) {
    console.error(err);
    doc.end();
    return res.status(500).send('Internal Server Error');
  }
});

const upload = multer({ dest: 'public/uploads/' });
app.post('/import', upload.single('file'), async (req, res) => {

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    const worksheet = workbook.getWorksheet(1);

    worksheet.eachRow((row, rowNumber) => {
      // Skip the header row
      if (rowNumber === 1) return;

      const user = new User({
        user_number: row.getCell(1).value,
        email: row.getCell(2).value,
        full_name: row.getCell(3).value,
        born_date: row.getCell(4).value,
        city: row.getCell(5).value,
        phone_number: row.getCell(6).value,
        position_at_church: row.getCell(7).value,
        tshirt_size: row.getCell(8).value,
        blazer_size: row.getCell(9).value,
        profile_picture: row.getCell(10).value,
        quotes_words: row.getCell(11).value,
      });

      user.save();
    });

    res.render('infoimport', { status: 'success' });
  } catch (error) {
    console.error(error);
    res.render('infoimport', { status: 'error' });
  }
});


// app.post('/import', upload.single('file'), async (req, res) => {
//    console.log(req.file.path);

//   try {
//     // Baca file excel menggunakan ExcelJS
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.readFile(req.file.path);

//     const worksheet = workbook.getWorksheet(1);
//     // Hapus judul header pada baris pertama
//     // worksheet.spliceRows(1, 1);

//     // Loop melalui setiap baris di file excel dan masukkan data ke dalam database
//     const rows = worksheet.getRows();
//     console.log(rows)
//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];

//       const user = new User({
//         user_number: row.getCell(1).value,
//         email: row.getCell(2).value,
//         full_name: row.getCell(3).value,
//         born_date: row.getCell(4).value,
//         city: row.getCell(5).value,
//         phone_number: row.getCell(6).value,
//         position_at_church: row.getCell(7).value,
//         tshirt_size: row.getCell(8).value,
//         blazer_size: row.getCell(9).value,
//         profile_picture: row.getCell(10).value,
//         quotes_words: row.getCell(11).value,
//       });
//       await user.save();
//     }

//     res.render('infoimport', { status: 'success' });
//   } catch (error) {
//     console.error(error);
//     res.render('infoimport', { status: 'error' });
//   }
// });


app.get('/import-data', function(req, res) {
  res.render('import');
});



app.listen(port, function() {
  console.log("Server started on port " + port);
});