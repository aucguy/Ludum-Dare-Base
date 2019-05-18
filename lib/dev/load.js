import { init } from '/src/main.js';

var game = null;

window.addEventListener('error', onError);

function onError(event) {  
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

game = init();