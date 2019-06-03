import { ajax } from '../common/ajax.js'

var assets = {};
var loaded = false;
var textureAtlasLayout = null;
var textureAtlasImage = null;
var manifest = @@MANIFEST@@;

function hasTextureAtlas() {
  return manifest.textureAtlasImage !== undefined &&
    manifest.textureAtlasLayout !== undefined
}

window.ldGetTextureAtlas = function() {
  if(hasTextureAtlas()) {
    return {
      image: textureAtlasImage,
      layout: textureAtlasLayout
    };
  } else {
    return null;
  }
};

window.ldGetAssets = function() {
  return assets;
};

export function assetsLoaded() {
  return loaded &&
    ((textureAtlasLayout && textureAtlasImage) || !hasTextureAtlas());
}

export function loadAssets() {
  if(hasTextureAtlas()) {
    ajax(manifest.textureAtlasLayout, false, request => {
      textureAtlasLayout = JSON.parse(request.response);
      window.ldBaseRun();
    });
    var tmpImg = new Image();
    tmpImg.onload = () => {
      textureAtlasImage = tmpImg;
      window.ldBaseRun();
    };
    tmpImg.onerror = () => {
      console.warn(`could not loaded ${manifest.textureAtlasImage}`);
    };
    tmpImg.src = manifest.textureAtlasImage;
  }
  
  var container = {
    loaded: 0,
    expected: manifest.items.length
  };
  
  for(let item of manifest.items) {
    if(item.type === 'json') {
      ajax(item.url, false, request => {
        onAssetLoaded(assets, item, JSON.parse(request.response), container);
      });
    } else if(item.type === 'image') {
      let image = new Image();
      image.onload = () => {
        onAssetLoaded(assets, item, image, container);
      };
      image.onerror = () => {
        console.warn(`could not loaded ${item.url}`);
      };
      image.src = item.url;
    } else {
      console.warn('unknown asset type');
      onAssetLoaded(assets, item, null, container);
    }
  }
}

function onAssetLoaded(assets, item, data, container) {
  assets[item.name] = {
    type: item.type,
    data
  };
  
  container.loaded++;
  if(container.loaded === container.expected) {
    loaded = true;
    window.ldBaseRun();
  }
}