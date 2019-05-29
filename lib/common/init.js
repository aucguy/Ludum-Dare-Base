import { init } from '/src/main.js'

window.ldBaseInitFunc = init;

if(window.ldBaseRun !== undefined) {
  var loadingLogo = document.getElementById('loadingLogo');
  loadingLogo.parentElement.removeChild(loadingLogo);
  window.ldBaseRun();
}