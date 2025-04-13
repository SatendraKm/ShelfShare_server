const validator = require("validator");

const signUpDataValidation = (req) => {
  const { fullName, emailId, password } = req.body;
  if (!fullName) {
    throw new Error("First Name and Last Name are required!");
  }
  if (!validator.isEmail(emailId)) {
    throw new Error("Email is not valid!");
  }
  if (password.length < 6) {
    throw new Error("Password should be atleast 6 characters long");
  }
  if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Password should contain atleast one uppercase, one lowercase, one number and one special character"
    );
  }
};

const loginDataValidation = (req) => {
  const { emailId } = req.body;

  if (!validator.isEmail(emailId)) {
    throw new Error("Email is not valid!");
  }
};

const profileDataValidation = (req) => {
  const allowedEditFields = ["fullName", "phoneNumber"];
  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );
  return isEditAllowed;
};
const passwordValidation = (password) => {
  if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Password should contain atleast one uppercase, one lowercase, one number and one special character"
    );
  }
  return true;
};

module.exports = {
  signUpDataValidation,
  loginDataValidation,
  profileDataValidation,
  passwordValidation,
};
