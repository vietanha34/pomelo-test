/**
 * Created by vietanha34 on 11/20/14.
 */


module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};
