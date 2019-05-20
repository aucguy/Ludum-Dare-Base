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

/**
 * sends a request to the server for the given asset
 */
function ajax(path, arraybuffer, onready, onfail) {
  onfail = onfail || (request => {
    console.warn(`asset ${path} failed to load with a status of ${request.status}`);
  });

  // taken from
  // http://www.w3schools.com/ajax/tryit.asp?filename=tryajax_first
  // and modified
  var request = window.XMLHttpRequest ? new XMLHttpRequest() :
      new ActiveXObject("Microsoft.XMLHTTP");
  request.responseType = arraybuffer ? 'arraybuffer' : 'text';
  request.onreadystatechange = () => {
    if (request.readyState === 4) {
      if (request.status === 200 || request.status === 0) {
        onready(request);
      } else {
        onfail(request);
      }
    }
  };
  request.open("GET", path, true);
  request.send();
}