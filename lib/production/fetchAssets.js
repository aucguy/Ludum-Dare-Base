import { ajax } from '../common/ajax.js'

var loaded = false;
var textureAtlasImage = null;
var textureAtlasURL = @@TEXTURE_ATLAS_URL@@;
var audioFiles = @@AUDIO_FILES@@;

function hasTextureAtlas() {
  return textureAtlasURL !== null;
}

window.ldGetTextureAtlasImage = function() {
  return textureAtlasImage;
};

export function assetsLoaded() {
  return textureAtlasImage !== null || !hasTextureAtlas();
}

export function loadAssets() {
  if(hasTextureAtlas()) {
    var tmpImg = new Image();
    tmpImg.onload = () => {
      textureAtlasImage = tmpImg;
      window.ldBaseRun();
    };
    tmpImg.onerror = () => {
      console.warn(`could not loaded ${manifest.textureAtlasImage}`);
    };
    tmpImg.src = textureAtlasURL;
  }
  for(var name in audioFiles) {
    ajax(audioFiles[name], true, () => {});
  }
}