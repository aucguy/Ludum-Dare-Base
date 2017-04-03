const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const gulp = require('gulp');

const replace = require('gulp-replace');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const pp = require('gulp-preprocess');
const addsrc = require('gulp-add-src');
const jshint = require('gulp-jshint');
const prettify = require('gulp-jsbeautifier');

const yargs = require('yargs');

const cPreprocess = require('./cPreprocess');
const util = require('./util');
const merge = require('./merge');
const streamMan = require('./streamMan');

const installDir = '.';

const MACRO_VARS = {
  keep: true,
  remove: false,
};

function load(ldBaseDir) {
  var ppVarsData = null;

  function ppVars() {
    if(ppVarsData === null) {
      var ppVarsFiles = [path.join(installDir, 'config.json'), path.join(ldBaseDir, 'toplevel/config.json')];
      var theFile = null;
      for(var ppVarsFile of ppVarsFiles) {
        if(fs.existsSync(ppVarsFile)) {
          theFile = ppVarsFile;
          break;
        }
      }
      if(theFile !== null) {
        try {
          ppVarsData = JSON.parse(fs.readFileSync(theFile));
        } catch(error) {
          if(error instanceof SyntaxError) {
            return error;
          } else {
            throw(error);
          }
        }
      } else {
        ppVarsData = {};
      }
    }
    return ppVarsData;
  }

  /**
   * get a nonexistant folder to back up to
   */
  function getBackupFolder(base) {
    max = 0;
    if(fs.existsSync(base)) {
      for(var file of fs.readdirSync(base)) {
        var num = util.strToFloat(file);
        if(num !== null) {
          max = Math.max(max, Math.ceil(num) + 1);
        }
      }
    }
    return path.join(base, max + '');
  }

  function fileCollections(filters) {
    var top = streamMan.getFiles([ldBaseDir, 'toplevel'], filters);
    var user = streamMan.rebase(top, installDir);
    return {
      top,
      user
    };
  }

  /**
   * backs up the generated files
   **/
  function backup(userFiles) {
    streamMan.srcWithBase(userFiles).pipe(gulp.dest(getBackupFolder('backup')));
  }

  function taskInit(obj, useConfig) {
    useConfig = useConfig === undefined ? true : useConfig;
    if(useConfig) {
      var config = ppVars();
      if(config instanceof Error) {
        obj.emit('error', config.message);
      }
      config.widthMargin = (util.strToFloat(config.width) + 20) + '';
      config.heightMargin = (util.strToFloat(config.height) + 20) + '';
    }
    var filters = yargs.argv.files ? util.replaceAll(yargs.argv.files, '~', '!').split(',') : null;
    var files = fileCollections(filters);
    backup(files.user);
    return files;
  }

  /**
   * preprocesses the toplevel files and merges them with the preexisting ones.
   **/
  gulp.task('setup', function() {
    var files = taskInit(this);
    //preprocess and merge
    streamMan.srcWithBase(files.top)
      .pipe(pp({
        context: util.mix(ppVars(), {
          base: util.escape(path.relative(path.resolve(path.join(ldBaseDir, 'dep')), path.resolve('.')))
        })
      }))
      //replace '/* *@' with '/* @'
      //these are special macros for preprocessing during the build process
      .pipe(replace(/\/\*(\s)*\*@/g, '/*$1@'))
      .pipe(merge.mergeGulp(installDir, installDir, true, 'user'))
      .pipe(gulp.dest(path.resolve(installDir)));
  });

  /**
   * Preprocesses the toplevel files c style.
   * use #if keep to keep lines and #if remove to lines. All other conditions
   * error.
   **/
  gulp.task('preprocess', function() {
    var userFiles = taskInit(this, false).user;

    streamMan.seqStream(streamMan.srcWithBase(userFiles),
      (stream) => stream.pipe(cPreprocess.preprocessGulp(MACRO_VARS)),
      (stream) => stream.pipe(gulp.dest(installDir)));
  });

  /**
   * builds the library
   **/
  function buildLib(lib, cmd) {
    var cwd = path.resolve(path.join(ldBaseDir, 'lib', lib));
    child_process.execSync('npm install', {
      cwd
    });
    child_process.execSync(cmd, {
      cwd
    });
  }

  gulp.task('build', function() {
    taskInit(this);
    //libraries
    buildLib('basejs', 'grunt build --injectors=phaser');
    buildLib('canvg', 'grunt build');
    buildLib(path.join('phaser', 'v2'), 'grunt full');

    var relVars = util.mix(ppVars(), {
      dev: false,
      rel: true
    });

    //application
    gulp.src(['src/**/*.js', path.join(ldBaseDir, 'src/**/*.js'), '!src/index.js'])
      .pipe(pp({
        context: relVars
      }))
      .pipe(concat('null'))
      .pipe(uglify())
      .pipe(addsrc.prepend([
        path.join(ldBaseDir, 'lib/basejs/build/baseinjectors.min.js'),
        path.join(ldBaseDir, 'lib/canvg/canvg.min.js'),
        path.join(ldBaseDir, 'lib/phaser/v2/dist/phaser.min.js')
      ]))
      .pipe(concat('app.min.js'))
      .pipe(gulp.dest('build/release'));

    //bootstrap
    streamMan.seqFile({},
      (files) => gulp.src(path.join(installDir, 'src/index.js'))
      .pipe(pp({
        context: relVars
      }))
      .pipe(uglify())
      .pipe(addsrc.prepend(path.join(ldBaseDir, 'lib/basejs/build/base.min.js')))
      .pipe(concat('output')),
      (files) => gulp.src(path.join(ldBaseDir, 'dep/index.html'))
      .pipe(pp({
        context: util.mix({
          //get the output file
          indexjs: files[Object.getOwnPropertyNames(files).filter(
            (name) => name.endsWith('output'))].contents.toString(),
        }, relVars)
      }))
      .pipe(gulp.dest('build/release')));

    //assets
    gulp.src('assets/**/*').pipe(gulp.dest('build/release/assets'));
  });

  function loadPluginConfig(name) {
    return JSON.parse(fs.readFileSync(path.join(ldBaseDir, 'dep', name)));
  }

  gulp.task('lint', function() {
    taskInit(this);
    gulp.src('src/**/*.js')
      .pipe(jshint(loadPluginConfig('.jshintrc')))
      .pipe(jshint.reporter('gulp-jshint-html-reporter'));
  });

  gulp.task('format', function() {
    backup(streamMan.getFiles('src'));
    gulp.src('src/**/*.js')
      .pipe(prettify(loadPluginConfig('.jsbeautifyrc')))
      .pipe(gulp.dest('src/'));
  });
}

module.exports = {
  load
};