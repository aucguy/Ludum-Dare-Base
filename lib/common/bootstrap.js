import { ajax } from './ajax.js'
import { getManifest } from '../dev/manifest.js'

var game = null;
var errored = false;
var assets = {};
var assetsLoaded = false;
var initFunc = null;

window.ldBaseInitFunc = window.ldBaseInitFunc || null;

window.ldBaseRun = () => {
  if(!errored && assetsLoaded && window.ldBaseInitFunc !== null) {
    game = window.ldBaseInitFunc();
  }
}

export function getAssets() {
  return assets;
}

window.addEventListener('error', onError);

function onError(event) { 
  if(errored) {
    console.warn('multiple errors');
    return;
  }
  
  errored = true;
  

  //swap displays and display error
  var errorDiv = document.getElementById('error div');
  var errorText = document.getElementById('error text');
  var display = document.getElementById('display');

  if(errorText) {
    errorText.innerHTML = event.error.stack;
  }
  if(errorDiv) {
    errorDiv.style.display = 'block';
  }
  
  if(game !== null) {
    game.destroy();
  }
}

getManifest(manifest => {  
  var container = {
    loaded: 0,
    manifest
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
      }
      image.src = item.url;
    } else {
      console.warn('unknown asset type');
      onAssetLoaded(assets, item, null, container);
    }
  }
});

function onAssetLoaded(assets, item, data, container) {
  assets[item.name] = {
    type: item.type,
    data
  };
  
  container.loaded++;
  if(container.loaded === container.manifest.items.length) {
    assetsLoaded = true;
    window.ldBaseRun();
  }
}