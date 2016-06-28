var Code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var rp = require('request-promise');
var qs = require('querystring');

var SDKService = module.exports;

SDKService.baseUrl = 'https://172.16.20.10:443';

/**
 *
 * @param opts
 * @param cb
 * @returns {Promise.<TResult>}
 */
SDKService.forward = function forward(opts, cb) {
  return rp({
    method: 'POST',
    uri: SDKService.baseUrl + opts.url,
    form: qs.parse(opts.body),
    timeout: 5000
  })
    .then(function (result) {
      return utils.invokeCallback(cb, null, result);
    })
    .catch(function (err) {
      console.error(err);
      utils.log(err);
      return utils.invokeCallback(cb, null, {ec: Code.EC.NORMAL});
    });
};
