/**
 * Created by vietanha34 on 12/2/14.
 */

/**
 *Module dependencies
 */

var util = require('util');
var lodash = require('lodash');
var utils = require('../../util/utils');

/**
 * Initialize a new 'Game' with the given 'opts'.
 *
 * @param {Object} opts
 * @api public
 */

var Game = function (opts) {
  this.gameId = opts.gameId;
  this.status = opts.status;
  var icon = { id : 0, version : 0};
  try {
    icon = JSON.parse(opts.icon)
  } catch (e){

  } finally {
    this.icon = icon;
  }
  this.name = [this.gameId];
  this.quick = opts.quick ? 1 : 0;
  this.link = opts.link ? opts.link : undefined;
};

/**
 * Expose 'Entity' constructor
 */

module.exports = Game;
