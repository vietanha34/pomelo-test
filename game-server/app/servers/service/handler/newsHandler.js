/**
 * Created by KienDT on 12/02/14.
 */

var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var NewsDao = require('../../../dao/newsDao');


module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.getList = function (msg, session, next) {
  NewsDao.getList(session.uid, msg.cate)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, []);
    });
};

Handler.prototype.getNews = function (msg, session, next) {
  NewsDao.getNews(session.uid, msg.id, 0)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {});
    });
};

Handler.prototype.getNewsByCate = function (msg, session, next) {
  NewsDao.getNews(session.uid, msg.cate, 1)
    .then(function(result) {
      return utils.invokeCallback(next, null, result);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(next, null, {});
    });
};