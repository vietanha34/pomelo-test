/**
 * Created by vietanha34 on 4/1/15.
 */
var bcrypt = require('bcrypt');
exports.cryptPassword = function(password) {
  var salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt)
};

exports.comparePassword = function(password, userPassword) {
  return bcrypt.compareSync(password, userPassword);
};
