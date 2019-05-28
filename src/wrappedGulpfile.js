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

const through = require('through2');
const rollup = require('rollup');
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');

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
        if(/^[0-9]+$/.test(file)) {
          var num = parseInt(file);
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
    
    var defaultConfigPath = path.join(ldBaseDir, 'src/config.json');
    var defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));
    
    var specifiedConfigPath = path.join(installDir, 'config.json');
    var specifiedConfig;
    if(fs.existsSync(specifiedConfigPath)) {
      specifiedConfig = JSON.parse(fs.readFileSync(specifiedConfigPath, 'utf-8'));
    } else {
      specifiedConfig = {};
    }
    
    var newConfig = Object.assign({}, defaultConfig, specifiedConfig);
    fs.writeFileSync(specifiedConfigPath, JSON.stringify(newConfig, null, 4));
    
    await buildLibs();
  });

  function handlePipeError(error) {
    console.log(error.fileName + ': ' + error.message);
  }
  
  function rollupPlugin(manifest) {
    var manifestId = path.normalize(path.resolve(installDir,
      'node_modules/aucguy-ludum-dare-base/lib/dev/manifest.js'));
    var replacePath = path.join(installDir,
      'node_modules/aucguy-ludum-dare-base/lib/production/manifest.js');
    return {
      name: 'ldBase',
      resolveId(source, importer) {
        if(source.startsWith('/')) {
          return source;
        } else if(importer !== undefined && importer.startsWith('/')) {
          return path.join(path.dirname(path.join(installDir, importer)), source);
        } else {
          return null;
        }
      },
      load(id) {
        var normalId = path.normalize(path.resolve(installDir, id));
        if(normalId === manifestId) {
          return fs.readFileSync(replacePath, 'utf-8')
            .replace('@@MANIFEST@@', manifest);
        } if(id.startsWith('/')) {
          return fs.readFileSync(path.join(installDir, id), 'utf-8');
        } else {
          return null;
        }
      }
    }
  };
  
  async function doRollup(input, output, name, manifest) {
    var bundle = await rollup.rollup({
      input,
      plugins: [rollupPlugin(manifest)]
    });
    
    await bundle.write({
      file: 'build/tmp.js',
      format: 'iife',
      name
    });
    
    await new Promise((resolve, reject) => {
      gulp.src('build/tmp.js')
        .pipe(babel({
          presets: ['@babel/env']
        }))
        .pipe(uglify())
        .pipe(concat(path.basename(output)))
        .pipe(gulp.dest(path.dirname(output)))
        .on('end', resolve);
    });
  }
  
  function jsonmin() {
    return through.obj((file, enc, cb) => {
      try {
        if(!file.isBuffer()) {
          cb(null, file);
          return;
        }
        if(path.extname(file.path) === '.json') {
          var contents = file.contents.toString(enc);
          contents = JSON.stringify(JSON.parse(contents));
          file.contents = Buffer.from(contents, enc);
        }
        cb(null, file);
      } catch(e) {
        cb(e, null);
      }
    });
  }

  gulp.task('build', async () => {
    //delete old release
    rimraf.sync('build/release');
    await buildLibs();
    
    var assetStr = fs.readFileSync('assets/manifest.json');
	  
    await doRollup(
      './node_modules/aucguy-ludum-dare-base/lib/common/bootstrap.js',
      'build/bootstrap.js',
      'ldBootstrap',
      assetStr
    );
    
    await doRollup(
      './node_modules/aucguy-ludum-dare-base/lib/common/init.js',
      'build/release/app.js',
      'ldApp',
      assetStr
    );
    
    //index.html
    await new Promise((resolve, reject) => {
      var config = getConfig();
      var bootstrapCode = fs.readFileSync('build/bootstrap.js', 'utf-8');
      
      gulp.src(path.join(ldBaseDir, 'lib/production/index.html'))
       .pipe(replace('@@TITLE@@', config.title))
       .pipe(replace('@@BOOTSTRAP@@', bootstrapCode))
       .pipe(concat('index.html'))
       .pipe(gulp.dest('build/release'))
       .on('end', resolve);
    });
    
    //assets
    await new Promise((resolve, reject) => {
      var config = getConfig();
      var manifest = JSON.parse(fs.readFileSync('assets/manifest.json', 'utf-8'));
      var paths = manifest.items.map(item => item.url);
      
      gulp.src(paths.concat(['assets/image/logo.png']))
        .pipe(imagemin([
          imagemin.gifsicle(),
          imagemin.jpegtran(),
          imagemin.optipng()
        ].concat(config.svgoDisabled === 'true' ? [] : [
            imagemin.svgo({
              plugins: [
                {
                  cleanupIDs: false
                }
              ]
            })
          ])
        ))
        .pipe(jsonmin())
        .pipe(gulp.dest('build/release/assets'))
        .on('end', resolve);
    });
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