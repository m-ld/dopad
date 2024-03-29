var _ = require('lodash'),
    log = require('../../lib/log'),
    jwtDecode = require('jwt-decode'),
    pass = require('pass-error'),
    browser = require('../browser'),
    BrowserIo = require('./browser');

function AblyIo(name) {
  BrowserIo.call(this, name);
  // Note that 'Ably.Realtime' is a global from https://cdn.ably.io/lib/ably.min.js
  this.realtime = global.Ably.Realtime({
    authUrl : browser.url(name, 'channel', 'auth'),
    log : { level : log.scale(4, -1) }
  });
  this.channel = this.realtime.channels.get(name);

  this.channel.presence.get(pass(function(members) {
    this.realtime.time(pass(function (timestamp) {
      this.channel.presence.enter(this.user, pass(function () {
        // Notify ourselves of existing users
        _.each([{ data : this.user, timestamp : timestamp }].concat(members), _.bind(function (message) {
          this.emit('user.connected', [message.data.id, message.timestamp, message.data]);
        }, this));
      }, this.close, null, this));
    }, this.close, null, this));
  }, this.close, null, this));

  // subscribers member is array of pairs [[subscriber, ablySubscriber]]
  this.events = {
    'user.connected' : { emitter : this.channel.presence, name : 'enter', subscribers : [] },
    'user.disconnected' : { emitter : this.channel.presence, name : 'leave', subscribers : [] },
    'action' : { emitter : this.channel, name : 'action', subscribers : [], echo : true },
    'interactions' : { emitter : this.channel, name : 'interactions', subscribers : [] }
  };
}

AblyIo.prototype = Object.create(BrowserIo.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.subscribe = function (eventName, subscriber) {
  var event = this.events[eventName];
  // Ably subscribers get a Message object, not just data
  var ablySubscriber = _.bind(function (message) {
    if (event.echo || message.clientId !== this.user.id) {
      subscriber.apply(this, [message.clientId, message.timestamp].concat(message.data));
    }
  }, this);
  event.emitter.subscribe(event.name, ablySubscriber);
  event.subscribers.push([subscriber, ablySubscriber]);
};

AblyIo.prototype.publish = function (eventName/*, data..., cb*/) {
  var event = this.events[eventName],
      data = _.tail(_.toArray(arguments)),
      cb = _.isFunction(_.last(data)) ? data.pop() : undefined;
  event.emitter.publish && event.emitter.publish(event.name, data, cb);
};

AblyIo.prototype.unsubscribe = function (eventName, subscriber) {
  var event = this.events[eventName],
      ablySubscriber = _.remove(event.subscribers, [0, subscriber])[0][1];
  event.emitter.unsubscribe(event.name, ablySubscriber);
};

AblyIo.prototype.subscribers = function (eventName) {
  return _.map(this.events[eventName].subscribers, 0);
};

AblyIo.prototype.close = function (err, cb) {
  if (_.includes(['closing', 'closed'], this.realtime.connection.state)) {
    // Already closing or closed, so just call the callback when closed
    cb && this.realtime.connection.once('closed', _.partial(cb, false));
  } else {
    this.realtime.connection.once('closed', _.bind(BrowserIo.prototype.close, this, err, cb));
  }
  this.realtime.close();
};

module.exports = AblyIo;
