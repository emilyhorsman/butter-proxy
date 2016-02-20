'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _expandTilde = require('expand-tilde');

var _expandTilde2 = _interopRequireDefault(_expandTilde);

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var checkExecutable = function checkExecutable(port, program, err, stdout, stderr) {
  var _stdout$trim$split = stdout.trim().split(/\:\s+/);

  var _stdout$trim$split2 = _slicedToArray(_stdout$trim$split, 2);

  var pid = _stdout$trim$split2[0];
  var path = _stdout$trim$split2[1];


  if (!path.startsWith((0, _expandTilde2.default)('~/src/'))) {
    return;
  }

  console.log(path + ' (' + pid + '/' + program + ') running on ' + port);
};

var somethingListeningOn = function somethingListeningOn(localAddr, program) {
  var _localAddr$split = localAddr.split(/\:+/);

  var _localAddr$split2 = _slicedToArray(_localAddr$split, 2);

  var addr = _localAddr$split2[0];
  var port = _localAddr$split2[1];

  var _program$split = program.split('/');

  var _program$split2 = _slicedToArray(_program$split, 2);

  var pid = _program$split2[0];
  var name = _program$split2[1];


  (0, _child_process.exec)('pwdx ' + pid, checkExecutable.bind(undefined, port, program));
};

var netstatColumns = {
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
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = lines[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var line = _step.value;

      var cols = line.trim().split(/\s+/);

      if (cols.length !== 7) {
        continue;
      }

      if (!cols[netstatColumns.proto].startsWith('tcp')) {
        continue;
      }

      if (cols[netstatColumns.program] === '-') {
        continue;
      }

      somethingListeningOn(cols[netstatColumns.localAddr], cols[netstatColumns.program]);
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
});
