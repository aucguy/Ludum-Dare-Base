import { assetsLoaded, loadAssets } from '../dev/fetchAssets.js'

var game = null;
var errored = false;
var initFunc = null;
var domLoaded = false;

window.ldBaseInitFunc = window.ldBaseInitFunc || null;

window.addEventListener('DOMContentLoaded', () => {
  domLoaded = true;
  window.ldBaseRun();
});

window.ldBaseRun = () => {
  if(!errored && assetsLoaded() && window.ldBaseInitFunc !== null && domLoaded) {
    var loadingLogo = document.getElementById('loadingLogo');
    if(loadingLogo !== null) {
      loadingLogo.parentElement.removeChild(loadingLogo);
    }
    game = window.ldBaseInitFunc();
  }
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
  var loadingLogo = document.getElementById('loadingLogo');

  if(errorText) {
    errorText.innerHTML = event.error.stack;
  }
  if(errorDiv) {
    errorDiv.style.display = 'block';
  }
  
  if(loadingLogo !== null) {
    loadingLogo.style.display = 'none';
  }
  
  if(display !== null) {
    display.style.display = 'none';
  }
  
  if(game !== null) {
    game.destroy();
    game.canvas.style.display = 'none';
  }
}

loadAssets();