require('dotenv').config();

var _ = require('lodash'),
    config = require('config'),
    log = require('../lib/log'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    validate = require('../lib/validate'),
    app = express(),
    server = require('http').createServer(app),
    _word = require('./word'),
    pass = require('pass-error'),
    _async = require('async'),
    auth = require('./auth'),
    port = process.env.PORT || 3000,
    Io = require('./io'),
    Journal = require('./journal'),
    io = new Io(server);

// This is used from the stop and restart scripts
process.title = 'Framespaces';

app.set('view engine', 'ejs');
app.use('/web', express.static('dist'));
app.use(bodyParser.json());
app.use(cookieParser());

function clientConfig(overrides) {
  return _.transform(overrides, function (result, value, path) {
    return _.set(result, path, value);
  }, _.pick(config, require('./clientConfigs')), overrides);
}

/**
 * GETting the base URL creates a browser-local framespace
 * NOTE this route sets an anonymous cookie, for later traceability
 */
app.get('/', auth.setCookie, function (req, res, next) {
  res.render('index', {
    fs : { name : 'anonymouse' },
    config : clientConfig({ 'modules.io' : 'local' }) // Local IO for anonymous fs
  })
});

/**
 * GETting a new framespace name
 */
app.get('/fsName', auth.cookie, function (req, res, next) {
  return _async.concatSeries(['adjective', 'noun'], function (partOfSpeech, cb) {
    _word.random({ includePartOfSpeech : partOfSpeech, maxLength : 5 }, cb);
  }, pass(function (words) {
    res.send(words.join(''));
  }, next));
});

/**
 * POSTing a framespace creates it
 */
app.post('/', auth.cookie, function (req, res, next) {
  var fs = req.body;
  validate.fs(fs, pass(function () {
    Journal(fs.name).putDetails(fs, pass(function (fs) {
      res.status(201).location('/' + fs.name).send(fs);
    }, next));
  }, next));
});

/**
 * GETting a framespace renders the HTML
 * TODO ... unless the framespace is private.
 */
app.get('/:fsName', auth.setCookie, function (req, res, next) {
  Journal(req.params.fsName).fetchDetails(pass(function (fs) {
    return fs ? io.createChannel(fs.name, Journal, pass(function () {
      return res.render('index', {
        fs : fs,
        config : clientConfig()
      });
    }, next)) : res.sendStatus(404);
  }, next));
});

/**
 * GETting the last snapshot and subsequent events for a framespace.
 */
app.get('/:fsName/events', auth.cookie, function (req, res, next) {
  Journal(req.params.fsName).fetchEvents(pass(function (snapshot, events) {
    return res.send({ snapshot : snapshot, events : events });
  }, next));
});

/**
 * POSTing a snapshot to the namespace.
 */
app.post('/:fsName/snapshot', auth.cookie, function (req, res, next) {
  // TODO: 100 - Continue dance
  var journal = Journal(req.params.fsName);
  return journal.offerSnapshot(req.body.timestamp, pass(function (nonce) {
    return nonce ? journal.addSnapshot(nonce, req.body, pass(function () {
      return res.send(201); // Created
    }, next)) : res.send(409); // Conflict
  }, next));
});

/**
 * GETting authorisation to use the realtime channel for a framespace
 */
app.get('/:fsName/channel/auth', auth.cookie, function (req, res, next) {
  io.authorise(req.params.fsName, req.user.id, pass(_.bind(res.send, res), next));
});

/**
 * GETting an error page from the client side
 */
app.get('/:fsName/error', function (req, res, next) {
  next(req.query.cause);
});

server.listen(port, pass(function () {
  log.info('Framespaces listening on port', port);
}, log.error));
