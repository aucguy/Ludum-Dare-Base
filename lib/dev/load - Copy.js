import { bu } from '/build/lib/apiIntercept.js';
import { init } from '/src/main.js';

var ctx = bu.createCtx(['interval', 'timeout', 'requestAnimationFrame', 'domEvent']);

function Tracker(options) {
  var onAdd = options.onAdd || (() => null);
  var onPostadd = options.onPostadd || (() => null);
  var registered = [];
  
  options.ctx.handler(options.name).on('add', event => {
    onAdd(event);
  });
  
  options.ctx.handler(options.name).on('postadd', event => {
    registered.push(event.returnValue);
    onPostadd(event);
    console.log({
      interval: intervalTracker.registered(),
      timeout: timeoutTracker.registered(),
      animationFrame: animationFrameTracker.registered()
    });
  });
  
  options.ctx.handler(options.name).on('remove', event => {
    var value = event.returnValue;
    registered = registered.filter(x => x !== value);
  });
  
  options.ctx.handler(options.name).on('error', event => {
    console.error(event.error);
  });
  
  return {
    registered() {
      return registered;
    },
    remove(value) {
      registered = registered.filter(x => x !== value);
    }
  };
}

var intervalTracker = Tracker({
  ctx,
  name: 'interval',
});

var timeoutTracker = Tracker({
  ctx,
  name: 'timeout',
});

function AnimationFrameTracker() {
  var map = new Map();
  
  var tracker = Tracker({
    ctx,
    name: 'requestAnimationFrame',
    onAdd(event) {
      var originalFunc = event.func;
      var func = () => {
        tracker.remove(map.get(func));
        return originalFunc();
      };
      event.func = func;
    },
    onPostadd(event) {
      map.set(event.func, event.returnValue);
    }
  });
  return tracker;
}

var animationFrameTracker = AnimationFrameTracker();

ctx.run(init);