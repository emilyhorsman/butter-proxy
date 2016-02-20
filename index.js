'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _child_process = require('child_process');

var _http = require('http');

var _httpProxy = require('http-proxy');

var _expandTilde = require('expand-tilde');

var _expandTilde2 = _interopRequireDefault(_expandTilde);

require('colors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var state = {};

function printChange(current, next) {
  var tld = process.env.BUTTER_PROXY_TLD || 'local';
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.keys(next)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      if (!current.hasOwnProperty(key)) {
        console.log(('[' + new Date().toISOString() + '] ' + key + ' on ' + next[key]).bold.green);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = Object.keys(current)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var key = _step2.value;

      if (!next.hasOwnProperty(key)) {
        console.log(('[' + new Date().toISOString() + '] ' + key + ' no longer listening on ' + current[key]).red);
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
}

function checkExecutable(resolve, port, program, err, stdout, stderr) {
  if (port === (process.env.BUTTER_PROXY_PORT || 80)) {
    return resolve({});
  }

  var _stdout$trim$split = stdout.trim().split(/\:\s+/);

  var _stdout$trim$split2 = _slicedToArray(_stdout$trim$split, 2);

  var pid = _stdout$trim$split2[0];
  var path = _stdout$trim$split2[1];


  var base = (0, _expandTilde2.default)(process.env.BUTTER_PROXY_BASE_DIR || '~/src/');
  if (!path.startsWith(base)) {
    return resolve({});
  }

  var folder = path.substr(base.length).split('/')[0];
  var ret = {};
  ret[folder] = port;
  return resolve(ret);
}

function somethingListeningOn(localAddr, program) {
  var _localAddr$split = localAddr.split(/\:+/);

  var _localAddr$split2 = _slicedToArray(_localAddr$split, 2);

  var addr = _localAddr$split2[0];
  var port = _localAddr$split2[1];

  var _program$split = program.split('/');

  var _program$split2 = _slicedToArray(_program$split, 2);

  var pid = _program$split2[0];
  var name = _program$split2[1];


  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)('pwdx ' + pid, checkExecutable.bind(null, resolve, port, program));
  });
}

var NETSTAT_COLUMNS = {
  proto: 0,
  localAddr: 3,
  program: 6
};

/*
 * c: refresh every second
 * l: only listening sockets
 * n: numeric ports instead of 'http'
 * t: TCP only
 * p: show PID and program
 */
var netstat = (0, _child_process.spawn)('netstat', ['-ctlpn']);
netstat.stdout.setEncoding('utf8');

netstat.stdout.on('data', function (data) {
  var lines = data.toString().split("\n");
  var promises = [];

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = lines[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var line = _step3.value;

      var cols = line.trim().split(/\s+/);

      if (cols.length !== 7) {
        continue;
      }

      if (!cols[NETSTAT_COLUMNS.proto].startsWith('tcp')) {
        continue;
      }

      if (cols[NETSTAT_COLUMNS.program] === '-') {
        continue;
      }

      promises.push(somethingListeningOn(cols[NETSTAT_COLUMNS.localAddr], cols[NETSTAT_COLUMNS.program]));
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  Promise.all(promises).then(function (servers) {
    var _Object;

    var nextState = (_Object = Object).assign.apply(_Object, [{}].concat(_toConsumableArray(servers)));
    printChange(state, nextState);
    state = nextState;
  });
});

var getTarget = function getTarget(host) {
  return 'http://localhost:' + state[host];
};

var binding = process.env.BUTTER_PROXY_PORT || 80;
var proxy = (0, _httpProxy.createProxyServer)();
(0, _http.createServer)(function (req, res) {
  proxy.web(req, res, {
    target: getTarget(req.headers['host'])
  });
}).listen(binding);

console.log(('[' + new Date().toISOString() + '] Listening on ' + binding).magenta);
