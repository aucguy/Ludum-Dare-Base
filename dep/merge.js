const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const through = require('through2');

const util = require('./util');

/**
 * merges two directories using bash diff.
 */
function merge(leftContents, rightFile, macroVar) {
  if(fs.existsSync(rightFile)) {
    try {
      child_process.execSync('diff -D' + macroVar + ' --ignore-all-space - "' + rightFile + '"', {
        input: leftContents
      });
    } catch(error) {
      //diff returns 1 if files are different
      if(error.status != 1) {
        throw(error);
      }
      //this can't be gotten in the try statement
      //as it will exit prior to being returned.
      return error.stdout;
    }
  }
  return null;
}

function mergeGulp(originalDir, outDir, checkConflicts, macroVar) {
  checkConflicts = checkConflicts || false;
  return through.obj(function(file, encoding, callback) {
    if(file.isBuffer()) {
      //make sure that there are no leftover conflicts
      if(checkConflicts) {
        var checkingFile = path.join(outDir, path.relative(file.base, file.path));
        if(fs.existsSync(checkingFile)) {
          var checking = fs.readFileSync(checkingFile, 'utf8');
          if(/^#/m.test(checking)) {
            util.emitError(this, 'conflicts not resolved in ' + checkingFile);
          }
        }
      }
      var other = path.join(originalDir, path.relative(file.base, file.path));
      var merged = merge(file.contents.toString(), other, macroVar);
      if(merged !== null) {
        file.contents = merged;
      }
    } else if(file.isStream()) {
      //TODO test
      util.emitError(this, 'streams not supported');
    }
    callback(null, file);
  });
}

module.exports = {
  merge,
  mergeGulp
};