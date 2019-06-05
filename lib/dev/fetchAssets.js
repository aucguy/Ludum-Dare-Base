import { ajax } from '../common/ajax.js'

var assets = {};
var loaded = false;

export function getAssets() {
  return assets;
}

export function assetsLoaded() {
  return loaded;
}

export function loadAssets() {
  ajax('/assets/manifest.json', false, request => {
    var manifest = JSON.parse(request.response);
    
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
      } else if(item.type === 'audio') {
        ajax(item.url, true, request => {
          onAssetLoaded(assets, item, null, container);
        });
      } else {
        console.warn('unknown asset type');
        onAssetLoaded(assets, item, null, container);
      }
    }
  });
}

function onAssetLoaded(assets, item, data, container) {
  assets[item.name] = {
    type: item.type,
    data,
    url: item.url
  };
  
  container.loaded++;
  if(container.loaded === container.manifest.items.length) {
    loaded = true;
    window.ldBaseRun();
  }
}