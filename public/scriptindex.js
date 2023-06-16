
document.querySelector('#registration-form').addEventListener('submit', function(event) {
  var phoneNumberInput = document.querySelector('#phone_number');
  var profilePicture = document.querySelector('#profile_picture');
  var phoneNumberValue = phoneNumberInput.value;
  if (phoneNumberValue.startsWith('08')) {
    phoneNumberInput.value = '628' + phoneNumberValue.slice(2).replace(/[^0-9]/g, '');
  }
  profilePicture.value = profilePicture.value.replace(/^data:image\/(png|jpg|jpeg);base64,/, "")
});
// window.onload = (async function() {
//   const compressor = new window.Compress();
//   console.log(compressor)
//   const browserSupportsExifOrientation = () => {
//     return new Promise((resolve) => Modernizr.on("exiforientation", resolve));
//   };

//   // Only rotate if browser does not support exit orientation.
//   const shouldRotate = async () => {
//     const supported = await browserSupportsExifOrientation();
//     return !supported;
//   };
//   const rotate = await shouldRotate();
//   console.log({ rotate });

//   const upload = document.getElementById("set_file");
//   const preview = document.getElementById("preview");
//   const profilePicture = document.getElementById("profile_picture")
//   upload.addEventListener(
//     "change",
//     async function(evt) {
//       const files = [...evt.target.files];
//       const results = await compressor.compress(files, {
//         size: 4,
//         quality: 0.75,
//         // rotate,
//       });
//       console.log(results);
//       const output = results[0];
//       const file = Compress.convertBase64ToFile(output.data, output.ext);
//       console.log(file);
//       preview.src = output.prefix + output.data;
//       profilePicture.value = output.data;
//     },
//     false
//   );
// })();

// document.getElementById('registration-form').addEventListener('submit', function(event) {
//   });
