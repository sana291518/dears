const bcrypt = require('bcryptjs');

bcrypt.hash('Admin@123', 10).then(hash => {
  console.log("Hashed password:", hash);
});
