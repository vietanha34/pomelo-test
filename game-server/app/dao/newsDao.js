/**
 * Created by vietanha34 on 9/23/15.
 */

var pomelo = require('pomelo');
var utils = require('../util/utils');
var moment = require('moment');
var NewsDao = module.exports;
var initCache = require('sequelize-redis-cache');
var cacher = initCache(pomelo.app.get('mysqlClient').sequelize, pomelo.app.get('redisCache'));

/**
 *
 * @param uid
 * @param cate
 * @param cb
 */
NewsDao.getList = function getList(uid, cate, cb) {
  if (!uid || !cate) {
    return utils.invokeCallback(cb, 'invalid param get news list');
  }

  return cacher('News')
    .ttl(NewsDao.CONFIG.CACHE_TIME)
    .findAll({
      attributes: ['id', 'title', 'updatedAt', 'isHot', 'isNew'],
      where: {
        cate: cate,
        status: 1
      },
      order: [['updatedAt', 'DESC']],
      limit: NewsDao.CONFIG.LIMIT,
      raw: true
    })
    .then(function(list) {
      list = list || [];
      list.forEach(function(e,i) {
        list[i].updatedAt = moment(list[i].updatedAt).format('HH:mm DD/MM');
      });
      return utils.invokeCallback(cb, null, {list: list, cate: cate});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {ec: 0});
    });
};

/**
 *
 * @param uid
 * @param id
 * @param type (0: id, 1: cate)
 * @param cb
 * @returns {*}
 */
NewsDao.getNews = function getNews(uid, id, type, langCode, cb) {
  if (!uid || !id) {
    return utils.invokeCallback(cb, 'invalid param get news detail');
  }
  langCode = langCode || 'vi'
  var where = {};
  if (!type)
    where.id = id;
  else {
    where.cate = id;
    where.langCode = langCode
  }

  return cacher('News')
    .ttl(NewsDao.CONFIG.CACHE_TIME)
    .findOne({
      attributes: ['title', 'content', 'updatedAt'],
      where: where,
      raw: true
    })
    .then(function(news) {
      news.updatedAt = moment(news.updatedAt).format('HH:mm DD/MM');
      return utils.invokeCallback(cb, null, news);
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
      return utils.invokeCallback(cb, null, {title: '', content: '', createdAt: ''});
    });
};

NewsDao.CONFIG = {
  CACHE_TIME: 300,
  LIMIT: 20
};
