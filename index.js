'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _child_process = require('child_process');

var _http = require('http');

var _httpProxy = require('http-proxy');

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _expandTilde = require('expand-tilde');

var _expandTilde2 = _interopRequireDefault(_expandTilde);

var _safe = require('colors/safe');

var _safe2 = _interopRequireDefault(_safe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

_commander2.default.version('1.0.0').description('Passes incoming requests to locally running development servers').option('-t, --tld [tld]', 'Top-level domain, defaults to local', 'local').option('-p, --port [port]', 'Port the proxy will bind to, defaults to 80', 80).option('-b, --base [path]', 'Only proxy to processes from this directory, defaults to ~/src', '~/src');
_commander2.default.parse(process.argv);

var state = {};

function log(string, color) {
  console.log(_safe2.default[color]('[' + new Date().toISOString() + '] ' + string));
}

var printChange = function printChange(current, next) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = Object.keys(next)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      if (!current.hasOwnProperty(key)) {
        log(key + '.' + _commander2.default.tld + ' on ' + next[key], 'green');
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
        log(key + ' no longer listening on ' + current[key], 'red');
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
};

function checkExecutable(resolve, opts, port, program, err, stdout, stderr) {
  var _stdout$trim$split = stdout.trim().split(/\:\s+/);

  var _stdout$trim$split2 = _slicedToArray(_stdout$trim$split, 2);

  var pid = _stdout$trim$split2[0];
  var path = _stdout$trim$split2[1];


  var base = (0, _expandTilde2.default)(opts.base);
  if (!path.startsWith(base)) {
    return resolve({});
  }

  var host = path.substr(base.length) // Remove the base dir as it isn't part of the host
  .split('/').filter(function (s) {
    return s;
  }) // Handle lack of trailing slash (remove blanks)
  .reverse() // Server in ~/src/foo/www should be www.foo.tld
  .join('.');

  var ret = {};
  ret[host] = port;
  return resolve(ret);
}

function somethingListeningOn(localAddr, program, opts) {
  var _localAddr$split = localAddr.split(/\:+/);

  var _localAddr$split2 = _slicedToArray(_localAddr$split, 2);

  var addr = _localAddr$split2[0];
  var port = _localAddr$split2[1];

  var _program$split = program.split('/');

  var _program$split2 = _slicedToArray(_program$split, 2);

  var pid = _program$split2[0];
  var name = _program$split2[1];


  if (opts.port === port) {
    return;
  }

  return new Promise(function (resolve, reject) {
    (0, _child_process.exec)('pwdx ' + pid, checkExecutable.bind(null, resolve, opts, port, program));
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

      promises.push(somethingListeningOn(cols[NETSTAT_COLUMNS.localAddr], cols[NETSTAT_COLUMNS.program], _commander2.default));
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

/*
 * The TLD is used for disambiguation purposes, but it can be left off. This
 * function will return false if the key is not a valid host.
 *
 * Let's say the base directory is `~`. A server is running in `~/src/foo/bar`.
 * If a request comes to `bar.foo.src`, it should work. If a request comes to
 * `bar.foo.src.local`, it should work, because the TLD is .local. If a request
 * comes to `bar.foo.src.xyz`, it should not work, since the TLD is not `xyz`
 * and since there is no server running in `~/src/foo/bar/xyz`
 */
var getTarget = function getTarget(host) {
  var i = host.indexOf('.' + _commander2.default.tld);
  var key = i === -1 ? host : host.slice(0, i);

  if (!state.hasOwnProperty(key)) {
    return false;
  }

  return 'http://localhost:' + state[key];
};

var binding = _commander2.default.port;
var proxy = (0, _httpProxy.createProxyServer)();

proxy.on('proxyRes', function (proxyRes, req, res) {
  log(proxyRes.statusCode + ' from ' + req.headers['host'] + req.url, 'magenta');
});

(0, _http.createServer)(function (req, res) {
  var host = req.headers['host'];
  var target = getTarget(host);
  log(req.method + ' ' + req.url + ' to ' + host, 'magenta');

  if (!target) {
    res.writeHead(400);
    return res.end();
  }

  proxy.web(req, res, {
    target: target
  });
}).listen(binding);

log('Listening on ' + binding, 'magenta');
