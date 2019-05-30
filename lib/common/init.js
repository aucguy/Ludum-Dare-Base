import { init } from '/src/main.js'

window.ldBaseInitFunc = init;

if(window.ldBaseRun !== undefined) {
  window.ldBaseRun();
}