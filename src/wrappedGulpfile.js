const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const replace = require('gulp-replace');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const addsrc = require('gulp-add-src');
const jshint = require('gulp-jshint');
const prettify = require('gulp-jsbeautifier');

const rimraf = require('rimraf');

const util = require('./util');
const through = require('through2');


const installDir = '.';
const ldBaseDir = 'node_modules/aucguy-ludum-dare-base';

function load(gulp) {
  var config = null;

  function getConfig() {
    if(config === null) {
      var configFiles = ['config.json', path.join(ldBaseDir, 'toplevel/config.json')];
      var theFile = null;
      for(var configFile of configFiles) {
        if(fs.existsSync(configFile)) {
          theFile = configFile;
          break;
        }
      }
      if(theFile !== null) {
        try {
          config = JSON.parse(fs.readFileSync(theFile));
        } catch(error) {
          if(error instanceof SyntaxError) {
            return error;
          } else {
            throw(error);
          }
        }
      } else {
        config = {};
      }
    }
    return config;
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
  
  /**
   * builds the library
   **/
  function buildLib(lib, cmd) {
    var cwd = path.resolve(lib);
    child_process.execSync('npm install', {
      cwd
    });
    child_process.execSync(cmd, {
      cwd
    });
  }
  
  function libDir(name) {
    var ret = path.join('node_modules', name);
    if(fs.existsSync(ret)) {
      return ret;
    }
    ret = path.join(ldBaseDir, 'node_modules', name);
    if(fs.existsSync(ret)) {
      return ret;
    }
    throw(new Error('library ' + name + ' not found'));
  }
  
  function mkdirsSync(dir) {
    if(!fs.existsSync(dir)) {
      mkdirsSync(path.dirname(dir));
      fs.mkdirSync(dir);
    }
  }
  
  async function copyLib(src, dst) {
    var intro = fs.readFileSync(path.join(ldBaseDir, 'src/intro', dst), {
      encoding: 'utf-8'
    });
    var outro = fs.readFileSync(path.join(ldBaseDir, 'src/outro', dst), {
      encoding: 'utf-8'
    });
    var contents = intro + fs.readFileSync(src, {
      encoding: 'utf-8'
    }) + outro;
    mkdirsSync(path.dirname(path.join('build/lib', dst)));
    fs.writeFileSync(path.join('build/lib', dst), contents, {
      encoding: 'utf-8'
    });
  }
  
  async function buildLibs() {
    //fabric is prebuilt
    var phaserDir = libDir('phaser');
    var fabricDir = libDir('fabric');
        
    await copyLib(path.join(fabricDir, 'dist/fabric.js'), 'fabric.js');
    await copyLib(path.join(phaserDir, 'dist/phaser.js'), 'phaser.js');
  }

  /**
   * copies the toplevel files into the main directory and builds the libraries
   */
  gulp.task('setup', async () => {
    await new Promise((resolve, reject) => {
      var src = path.join(ldBaseDir, 'toplevel');
      
      gulp.src([path.join(src, '**/*')], {
        dot: true,
        base: src
      }).pipe(gulp.dest(installDir)).on('end', resolve);
    });
    
    await buildLibs();
  });

  function handlePipeError(error) {
    console.log(error.fileName + ': ' + error.message);
  }

  gulp.task('build', async () => {
    //delete old release
    rimraf.sync('build/release');
    await buildLibs();
    
    var config = getConfig();
    var assetItems = [
      ['scripts/app', 'app.min.js', 'script'],
    ].concat(JSON.parse(fs.readFileSync('assets/manifest.json')).items);
    var assetStr = JSON.stringify(assetItems);
	    
    //fabric uglify
    await new Promise((resolve, reject) => {
      gulp.src('build/lib/fabric.js')
        .pipe(uglify())
        .pipe(concat('fabric.min.js'))
        .pipe(gulp.dest('build/lib'))
        .on('end', () => {
          //application
          gulp.src(['src/**/*.js', path.join(ldBaseDir, 'lib/common/**/*.js'), '!' + path.join(ldBaseDir, 'lib/common/indexlib.js')])
            .pipe(uglify())
            .on('error', handlePipeError)
            .pipe(addsrc.prepend([
              'build/lib/fabric.min.js',
              'build/lib/phaser.min.js',
              'build/lib/baseinjectors.min.js',
            ]))
            .pipe(concat('app.min.js'))
            .pipe(gulp.dest('build/release'))
            .on('end', resolve);
        });
    });
    
    //bootstrap
    await new Promise((resolve, reject) => {
      gulp.src([path.join(ldBaseDir, 'lib/common/indexlib.js'), path.join(ldBaseDir, 'lib/production/index.js')])
        .pipe(replace('@@ASSETS_JSON@@', assetStr))
        .pipe(uglify())
        .on('error', handlePipeError)
        .pipe(addsrc.prepend('build/lib/base.min.js'))
        .pipe(concat('bootstrap.min.js'))
        .pipe(gulp.dest('build/release'))
        .on('end', resolve);
    })
    
    //index.html
    await new Promise((resolve, reject) => {
      gulp.src(path.join(ldBaseDir, 'lib/production/index.html'))
       .pipe(replace('@@TITLE@@', config.title))
       .pipe(concat('index.html'))
       .pipe(gulp.dest('build/release'))
       .on('end', resolve);
    })
    
    //assets
    await new Promise((resolve, reject) => {
      gulp.src(['assets/**/*', '!assets/manifest.json'])
        .pipe(gulp.dest('build/release/assets'))
        .on('end', resolve);
    })
  });

  function loadPluginConfig(name) {
    return JSON.parse(fs.readFileSync(path.join(ldBaseDir, 'src', name)));
  }

  gulp.task('lint', function() {
    return gulp.src('src/**/*.js')
      .pipe(jshint(loadPluginConfig('.jshintrc')))
      .pipe(jshint.reporter('gulp-jshint-html-reporter'));
  });

  gulp.task('format', async function() {
    await new Promise((resolve, reject) => {
      gulp.src('src/**/*.js')
        .pipe(gulp.dest(getBackupFolder('backup')))
        .on('end', resolve);
    });
    
    await new Promise((resolve, reject) => {
      gulp.src('src/**/*.js')
        .pipe(prettify(loadPluginConfig('.jsbeautifyrc')))
        .pipe(gulp.dest('src/'))
        .on('end', resolve);
    });
  });
}

module.exports = {
  load
};