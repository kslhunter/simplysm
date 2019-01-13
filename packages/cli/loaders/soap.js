/*
 * Copyright (c) 2011 Vinay Pulim <vinay@milewise.com>
 * MIT Licensed
 */

"use strict";
var Client = require('../../../soap/lib/client').Client;
var wsdl = require('../../../soap/lib/wsdl');

function createCache() {
  var cache = {};
  return function (key, load, callback) {
    if (!cache[key]) {
      load(function (err, result) {
        if (err) {
          return callback(err);
        }
        cache[key] = result;
        callback(null, result);
      });
    }
    else {
      process.nextTick(function () {
        callback(null, cache[key]);
      });
    }
  };
}

var getFromCache = createCache();

function _requestWSDL(url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  var openWsdl = wsdl.open_wsdl.bind(null, url, options);

  if (options.disableCache === true) {
    openWsdl(callback);
  }
  else {
    getFromCache(url, openWsdl, callback);
  }
}

function createClient(url, options, callback, endpoint) {
  if (typeof options === 'function') {
    endpoint = callback;
    callback = options;
    options = {};
  }
  endpoint = options.endpoint || endpoint;
  _requestWSDL(url, options, function (err, wsdl) {
    callback(err, wsdl && new Client(wsdl, endpoint, options));
  });
}

function createClientAsync(url, options, endpoint) {
  if (typeof options === 'undefined') {
    options = {};
  }
  return new Promise(function (resolve, reject) {
    createClient(url, options, function (err, client) {
      if (err) {
        reject(err);
      }
      resolve(client);
    }, endpoint);
  });
}

exports.createClient = createClient;
exports.createClientAsync = createClientAsync;
