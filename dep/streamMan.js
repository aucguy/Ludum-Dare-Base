const path = require('path');

const through = require('through2');
const glob = require('glob');
const gulp = require('gulp');

function setBase(base) {
  return through.obj(function(file, encoding, callback) {
    file.base = base;
    callback(null, file);
  });
}

/**
 * gets the files in a directory and subdirectories
 * while storing the common base.
 */
function getFiles(parts, filters) {
  if(!(parts instanceof Array)) {
    parts = [parts];
  }
  filters = filters || '**/*';
  if(!(filters instanceof Array)) {
    filters = [filters];
  }
  var base = path.join.apply(path, parts);
  var src = [];
  for(var filter of filters) {
    var exclude = false;
    if(filter.startsWith('!')) {
      exclude = true;
      filter = filter.slice(1);
    }
    var partSrc = glob.sync(path.join(base, filter), {
      dot: true
    });
    if(exclude) {
      src = src.filter((item) => partSrc.indexOf(item) === -1);
    } else {
      src = src.concat(partSrc);
    }
  }
  return {
    src,
    base
  };
}

/**
 * changes the base of the fileset.
 **/
function rebase(srcSet, base) {
  var src = srcSet.src.map((file) => path.join(base,
    path.relative(srcSet.base, file)));
  return {
    src,
    base
  };
}

/**
 * does a gulp stream with the fileset under its base.
 **/
function srcWithBase(obj) {
  return gulp.src(obj.src).pipe(setBase(obj.base));
}

/**
 * stores the processed files in memory in the store(an object).
 **/
function destFileStore(store) {
  return through.obj(function stream(file, encoding, callback) {
    store[file.path] = {
      contents: file.contents,
      base: file.base
    };
    callback(null, file);
  });
}

/**
 * Takes objects from the store and puts it through a stream for use.
 **/
function srcFileStore(store) {
  return gulp.src(Object.getOwnPropertyNames(store))
    .pipe(through.obj(function(file, encoding, callback) {
      file.contents = store[file.path].contents;
      file.base = store[file.path].base;
      callback(null, file);
    }));
}

/**
 * executes streams sequentially with each taking the output of the previous
 * stream as its input. The first one takes the first argument as its input/
 **/
function seqStream(src /*, streams */ ) {
  seqStreamIndex(src, Array.prototype.slice.call(arguments, 1), 0);
}

/**
 * internal function
 **/
function seqStreamIndex(src, streams, i) {
  var store = {};
  var stream = streams[i](src).pipe(destFileStore(store));
  if(i < streams.length - 1) {
    stream.on('finish', function() {
      seqStreamIndex(srcFileStore(store), streams, i + 1);
    });
  }
}

/**
 * executes streams sequentially with each taking the files output of the previous
 * stream as the argument. The first one takes the first argument as its argument
 */
function seqFile(src /*, streams */ ) {
  seqFileIndex(src, Array.prototype.slice.call(arguments, 1), 0);
}

/**
 * internal function
 */
function seqFileIndex(src, streams, i) {
  var store = {};
  var stream = streams[i](src).pipe(destFileStore(store));
  if(i < streams.length - 1) {
    stream.on('finish', function() {
      seqFileIndex(store, streams, i + 1);
    });
  }
}

module.exports = {
  getFiles,
  rebase,
  srcWithBase,
  seqStream,
  seqFile
};