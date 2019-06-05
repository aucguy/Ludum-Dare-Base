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
const binpack = require('bin-pack');
const canvas = require('canvas');

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
  
  function rollupPlugin(replacements) {
    var redirect = {
      'lib/dev/fetchAssets.js': 'lib/production/fetchAssets.js',
      'lib/dev/processAssets.js': 'lib/production/processAssets.js'
    };
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
        var normalId = path.normalize(path.resolve(path.join(installDir, id)));
        
        for(var i in redirect) {
          if(path.normalize(path.resolve(path.join(ldBaseDir, i))) === normalId) {
            var contents = fs.readFileSync(path.join(ldBaseDir, redirect[i]), 'utf-8');
            
            for(var name in replacements) {
              contents = contents.replace(`@@${name}@@`, replacements[name]);
            }
            
            return contents;
          }
        }
        
        if(id.startsWith('/')) {
          return fs.readFileSync(path.join(installDir, id), 'utf-8');
        } else {
          return null;
        }
      }
    }
  };
  
  async function doRollup(input, output, name, replacements) {
    var bundle = await rollup.rollup({
      input,
      plugins: [rollupPlugin(replacements)]
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
  
  async function generateImageAtlas() {
    var manifest = JSON.parse(fs.readFileSync('assets/manifest.json', 'utf-8'));
    var images = [];
    var item;
    for(item of manifest.items) {
      if(item.type === 'image' && path.extname(item.url) === '.png') {
        var can = await canvas.loadImage(path.join(installDir, item.url));
        images.push({
          width: can.width,
          height: can.height,
          image: can,
          name: item.name
        });
      }
    }
    var packed = binpack(images);
    var output = canvas.createCanvas(packed.width, packed.height);
    var ctx = output.getContext('2d');
    var layout = {};
    for(item of packed.items) {
      ctx.drawImage(item.item.image, item.x, item.y);
      layout[item.item.name] = {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      };
    }
    mkdirsSync(path.join(installDir, 'build/release'));
    var stream = fs.createWriteStream(path.join(installDir,
      'build/textureAtlas.png'));
    output.createPNGStream().pipe(stream);
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
    });
    
    await new Promise((resolve, reject) => {
      gulp.src('build/textureAtlas.png')
        .pipe(getImagemin())
        .pipe(gulp.dest('build/release'))
        .on('end', resolve);
    });
    
    return layout;
  }
  
  function getAudioFiles() {
    var manifest = JSON.parse(fs.readFileSync('assets/manifest.json', 'utf-8'));
    var files = {};
    
    for(var item of manifest.items) {
      if(item.type === 'audio') {
        files[item.name] = item.url;
      }
    }
    
    return files;
  }
  
  async function getReplacements(layout) {
    await new Promise((resolve, reject) => {
      gulp.src('assets/**/*.svg')
        .pipe(getImagemin())
        .pipe(gulp.dest('build/assets'))
        .on('end', resolve);
    });
    
    var manifest = JSON.parse(fs.readFileSync('assets/manifest.json', 'utf-8'));
    var assets = {};
    
    var hasTextureAtlas = false;
    
    for(var item of manifest.items) {
      var loc = path.join(installDir, item.url);
      if(item.type === 'text') {
        assets[item.name] = {
          type: 'text',
          data: fs.readFileSync(loc, 'utf-8')
        };
      } else if(item.type === 'json') {
        assets[item.name] = {
          type: 'text',
          data: JSON.parse(fs.readFileSync(loc, 'utf-8'))
        };
      } else if(item.type === 'image' && path.extname(item.url) === '.svg') {
        var p = path.join('build/assets', path.relative('assets', loc));
        var text = fs.readFileSync(p, 'utf-8');
        text = text.substring(text.indexOf('<svg'));
        assets[item.name] = {
          type: 'image',
          text
        };
      } else if(item.type === 'image') {
        hasTextureAtlas = true;
      } else if(item.type === 'audio') {
      } else {
        console.error(`unknown asset type url: ${item.url}, type: {item.type}`);
      }
    }
        
    return {
      ASSETS: JSON.stringify(assets),
      TEXTURE_ATLAS_URL: hasTextureAtlas ? "'textureAtlas.png'" : 'null',
      TEXTURE_ATLAS_LAYOUT: hasTextureAtlas ? JSON.stringify(layout) : 'null',
      AUDIO_FILES: JSON.stringify(getAudioFiles()),
    };
  }
  
  function getImagemin() {
    var config = getConfig();
    
    var plugins = [
      imagemin.gifsicle(),
      imagemin.jpegtran(),
      imagemin.optipng()
    ];
    
    if(config.svgoDisabled !== 'true') {
      plugins.push(imagemin.svgo({
        plugins: [
          {
            cleanupIDs: false
          }
        ]
      }));
    }
    
    return imagemin(plugins);
  }

  gulp.task('build', async () => {
    //delete old release
    rimraf.sync('build/release');
    await buildLibs();
    
    var layout = await generateImageAtlas();
    var replacements = await getReplacements(layout);
    	  
    await doRollup(
      './node_modules/aucguy-ludum-dare-base/lib/common/bootstrap.js',
      'build/bootstrap.js',
      'ldBootstrap',
      replacements
    );
    
    await doRollup(
      './node_modules/aucguy-ludum-dare-base/lib/common/init.js',
      'build/app.js',
      'ldApp',
      replacements
    );
    
    await new Promise((resolve, reject) => {
      gulp.src('build/app.js')
        .pipe(addsrc.prepend(path.join(libDir('@babel/polyfill'), 'dist/polyfill.min.js')))
        .pipe(concat('app.js'))
        .pipe(gulp.dest('build/release'))
        .on('end', resolve);
    });
    
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
      var manifest = JSON.parse(fs.readFileSync(
        path.join(installDir, 'assets/manifest.json')));
      
      var audioFiles = getAudioFiles();
      var paths = ['assets/image/logo.png'];
      for(var name in audioFiles) {
        paths.push(audioFiles[name]);
      }
      
      gulp.src(paths)
        .pipe(through.obj((file, enc, cb) => {
          file.base = path.resolve(path.join(installDir, 'assets'));
          cb(null, file);
        }))
        .pipe(getImagemin())
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