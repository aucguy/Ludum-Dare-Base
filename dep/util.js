const gutil = require('gulp-util');
const through = require('through2');

/**
 * emit an error with the given message
 **/
function emitError(obj, msg) {
  obj.emit('error', new gutil.PluginError('LDBase', msg));
}

function escape(str) {
  return replaceAll(str, '\\\\', '/');
}

/**
 * converts a string to a float or 
 * returns null if the string is in the incorrect format
 **/
function strToFloat(str) {
  var num;
  try {
    return parseFloat(str);
  } catch(error) {
    return null;
  }
}

//from https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
function replaceAll(original, first, second) {
  return original.replace(new RegExp(first, 'g'), second);
}

/**
 * combines the properties of the objects into one
 **/
function mix( /* objects */ ) {
  var mixed = {};
  for(var i = arguments.length; i >= 0; i--) {
    var obj = arguments[i];

    for(var name in obj) {
      mixed[name] = obj[name];
    }
  }
  return mixed;
}

/**
 * prints the files that are in the stream
 **/
function log() {
  return through.obj(function(file, encoding, callback) {
    if(file.isBuffer()) {
      console.log(file.path);
      console.log(file.contents.toString());
    }
    callback(null, file);
  });
}

module.exports = {
  emitError,
  escape,
  strToFloat,
  replaceAll,
  mix,
  log
};