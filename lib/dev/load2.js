import { bu } from '/build/lib/apiIntercept.js';
import { init } from '/src/main.js';

var ctx = bu.createCtx(['domEvent', 'interval', 'timeout', 'requestAnimationFrame', 'eventListener']);

function Tracker(ctx, handler) {
  var registered = [];
  
  ctx.handler(handler).on('add', event => {
    var originalFunc = event.func;
    var func = function() {
      registered.splice(registered.indexOf(func.id, 1));
      originalFunc.apply(this, arguments);
    };
    event.func = func;
  });
  
  ctx.handler(handler).on('postadd', event => {
    registered.push(event.returnValue);
    event.func.id = event.returnValue;
  });
  
  ctx.handler(handler).on('remove', event => {
    registered.splice(registered.indexOf(func.id, 1));
  });
  
  ctx.handler(handler).on('error', event => onError(event));
  
  return {
    registered: () => registered
  };
}

var intervalTracker = Tracker(ctx, 'timeout');
var timeoutTracker = Tracker(ctx, 'timeout');
var animationFrameTracker = Tracker(ctx, 'requestAnimationFrame');

var registeredDomEvents = [];

ctx.handler('domEvent').on('change', event => {
  var index = registeredDomEvents.findIndex(x =>
    x.object === event.object &&
    x.property === event.property
  );
  
  if(index !== -1) {
    registeredDomEvents.splice(index, 1);
  }
  
  if(typeof event.newValue === 'function') {
    registeredDomEvents.push({
      object: event.object,
      property: event.property
    });
  }
});

ctx.handler('domEvent').on('error', event => onError(event));

var registeredEventListeners = [];

ctx.handler('eventListener').on('add', event => {
  registeredEventListeners.push({
    object: event.object,
    listenerName: event.listenerName,
    func: event.func,
    optionsOrUseCapture: event.optionsOrUseCapture
  });
});

ctx.handler('eventListener').on('remove', event => {
  var index = registeredEventListeners.findIndex(x =>
    x.object === event.object &&
    x.listenerName === event.listenerName &&
    x.func === event.func);
  
  if(index !== -1) {
    registeredEventListeners.splice(index, 1);
  }
});

function onError(event) {
  console.error(event.error.stack);
  
  var i;
  for(i of intervalTracker.registered()) {
    clearInterval(i);
  }
  
  for(i of timeoutTracker.registered()) {
    clearTimeout(i);
  }
  
  for(i of animationFrameTracker.registered()) {
    cancelAnimationFrame(i);
  }
  
  for(i of registeredDomEvents) {
    i.object[i.property] = null;
  }
  
  for(i of registeredEventListeners) {
    if(i.listenerName === 'MSPointerDown') {
      console.log(i);
    }
    i.object.removeEventListener(i.listenerName, i.func, i.optionsOrUseCapture);
  }
  
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
  if(display) {
    //display.style.display = 'none';
  }
}

ctx.run(init);