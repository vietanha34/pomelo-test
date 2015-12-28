/**
 * Created by vietanha34 on 1/12/15.
 */

var RegexValid = module.exports;

RegexValid.validMongoObjectId = function(id){
  return id.match(/^[0-9a-fA-F]{24}$/)
};

RegexValid.validEmail = function validEmail(email) {
  return email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);
};

RegexValid.validDate = function validDate(date) {
  return ((new Date(date)).getDate() ? true : false);
};

RegexValid.validPhone = function (phone) {
  var pre2 = phone.substr(0, 2);
  var pre1 = phone.substr(0, 1);
  var regex;
  switch (pre2) {
    case '84':
      regex = new RegExp(/^849[0-9]{8}/); // phome include 10 number
      var regex2 = new RegExp(/^841[0-9]{9}/); // phome include 11 number
      if (regex.test(phone) ||
        regex2.test(phone))
        return '0' + phone.substr(2);
      break;
    case '09':
      regex = new RegExp(/^09[0-9]{8}/);
      if (regex.test(phone)) // phome include 10 number
        return "0" + phone.substr(1);
      break;
    case '01':
      regex = new RegExp(/^01[0-9]{9}/);
      if (regex.test(phone)) // phome include 10 number
        return "0" + phone.substr(1);
      break;
  }
  switch (pre1) {
    case '9':
      regex = new RegExp(/^9[0-9]{8}/);
      if (regex.test(phone)) // phome include 10 number
        return "0" + phone;
      break;
    case '1':
      regex = new RegExp(/^1[0-9]{9}/);
      if (regex.test(phone)) // phome include 10 number
        return "0" + phone;
      break;
  }

  return false;
};