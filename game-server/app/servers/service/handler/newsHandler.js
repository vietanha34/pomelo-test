/**
 * Created by KienDT on 12/02/14.
 */


module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.getNews = function (msg, session, next) {
  newsDao.getNews(msg.id, function(e, result) {
    if (e)
      next(e.stack || e, {ec: 500 });
    else
      next(null, result);
  });
};

Handler.prototype.getList = function (msg, session, next) {
  newsDao.getList(msg.categoryId, msg.limit, msg.page, function(e, result) {
    if (e)
      next(e.stack || e, {ec: 500 });
    else {
      result.categoryId = msg.categoryId;
      next(null, result);
    }
  });
};