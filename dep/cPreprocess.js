const through = require('through2');
const util = require('./util');

function emitPreprocessError(obj, msg, file, line) {
  util.emitError(obj, msg + ' at line ' + line + ' in file ' + file.path);
}

function macroIfOrNot(negate) {
  return function(args, stack, variables, error) {
    var value = variables[args[1]];
    if(value !== undefined) {
      if(negate) {
        value = !value;
      }
      stack.push(value);
    } else {
      error('invalid condition');
    }
  };
}

function macroElse(args, stack, variables, error) {
  stack.push(!stack.pop());
}

function macroEndIf(args, stack, variables, error) {
  stack.pop();
  if(stack.length === 0) {
    error('too many endifs');
  }
}

const macroIf = macroIfOrNot(false);
const macroIfNot = macroIfOrNot(true);

const MACROS = {
  'if': {
    func: macroIf,
    args: 2
  },
  'ifdef': {
    func: macroIf,
    args: 2
  },
  'ifndef': {
    func: macroIfNot,
    args: 2
  },
  'else': {
    func: macroElse,
    args: 1
  },
  'endif': {
    func: macroEndIf,
    args: 1
  }
};

function preprocess(text, variables, errorCallback) {
  var lines = util.replaceAll(text, '\r\n', '\n').split('\n');
  var stack = [true];
  var output = [];
  var i = 1;
  for(var line of lines) {
    var parts = line.split(/\s/).filter((part) => part !== '');
    if(parts.length > 0 && parts[0].startsWith('#')) {
      var error = function(msg) {
        errorCallback(msg, i);
      };
      var macro = MACROS[parts[0].slice(1)];
      if(macro === undefined) {
        error('invalid macro');
      }
      if(parts.length < macro.args) {
        emitPreprocessError(this, 'invalid number of arguments', file, i);
      }
      macro.func(parts, stack, variables, error);
    } else {
      if(stack.indexOf(false) === -1) {
        output.push(line);
      }
    }
    i++;
  }
  return output.join('\n');
}

function preprocessGulp(variables) {
  return through.obj(function(file, encoding, callback) {
    if(file.isBuffer()) {
      file.contents = Buffer.from(preprocess(file.contents.toString(), variables,
        (msg, line) => emitPreprocessError(this, msg, file, line)));
    } else if(file.isStream()) {
      //TODO test
      emitError(this, 'streams not supported');
    }
    callback(null, file);
  });
}

module.exports = {
  preprocess,
  preprocessGulp
};