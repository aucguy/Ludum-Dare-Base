base.registerModule('gui', function() {
  var util = base.importModule('util');
  
  MOUSE_STATES = {
    ACTIVE: 0,
    DISABLED_NOW: 1,
    DISABLED_ALWAYS: 2
  };
  
  var Menu = util.extend(Object, 'Menu', {
    constructor: function Menu(gui, game, onUpdate, x, y, context) {
      x = x || 0;
      y = y || 0;
      this.game = game;
      this.guiContext = context || new GuiContext(this);
      this.gui = gui;
      this.targetCanvas = null;
      this.sprite = null;
      this.canvg = null;
      this.dirty = false;
      this.clickCallbacks = {};
      this.releaseCallbacks = {};
      this.mouseState = MOUSE_STATES.ACTIVE;
      this.menuClicked = false;
      
      this.loadMenu(this.gui, x, y);
      onUpdate.add(this.update, this);
      this.game.input.onDown.add(this.onClick, this);
    },
    update: function update() {
      this.canvg.update();
      this.sprite.setTexture(PIXI.Texture.fromCanvas(this.targetCanvas));
      if(this.mouseState == MOUSE_STATES.DISABLED_NOW) {
        this.mouseState = MOUSE_STATES.ACTIVE;
      }
      this.menuClicked = false;
    },
    onClick: function onClick(pointer) {
      if(this.mouseState == MOUSE_STATES.ACTIVE) {
        this.mouseState = MOUSE_STATES.DISABLED_NOW;
        var event = new MouseEvent('click', {
          clientX: pointer.position.x - this.sprite.position.x,
          clientY: pointer.position.y - this.sprite.position.y,
          button: pointer.button
        });
        this.targetCanvas.dispatchEvent(event);
      }
      this.canvg.dirty = true;
      this.canvg.update();
    },
    loadMenu: function loadMenu(newMenu, x, y) {
      if(this.canvg) return;
      var svg = util.xmlParser.parseFromString(base.getAsset(newMenu), 'text/xml');
      var width = svg.width;
      var height = svg.height;
      this.targetCanvas = util.createCanvas(width, height);
      this.loadCallbacks(svg);
      this.sprite = this.game.add.sprite(x, y, null);
      this.canvg = canvg(this.targetCanvas, svg, {
        eventCallback: function(event, element) {
          this.menuClicked = true;
          var id = element.attribute('id').value;
          if(event.type == 'onclick' && this.clickCallbacks.hasOwnProperty(id)) {
            this.clickCallbacks[id](event, element);
          } else if(event.type == 'onrelease' && this.releaseCallbacks.hasOwnProperty(id)) {
            this.releaseCallbacks[id](event, element);
          }
        }.bind(this),
        forceRedraw: function() {
          var tmp = this.dirty;
          this.dirty = false;
          return tmp;
        }.bind(this)
      });
    },
    loadCallbacks: function loadCallbacks(svg) {
      var treeWalker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
      while(treeWalker.nextNode()) {
        var element = treeWalker.currentNode;
        if(element.hasAttribute('onclick') && element.hasAttribute('id')) {
          var onclick = this.parseCallback(element.getAttribute('onclick'));
          var id = element.getAttribute('id');
          if(onclick) this.clickCallbacks[id] = onclick;
        }
      }
    },
    parseCallback: function parseCallback(callback) {
      var tmp = callback.split(' ');
      var parts = [];
      for(var i=0; i<tmp.length; i++) { //filter empty
        if(tmp[i]) parts.push(tmp[i]);
      }

      if(!parts[0]) return null;

      if(!(parts[0] in this.guiContext))
        throw(new Error("invalid callback '" + callback + "'"));

      return function() {
        if(this.guiContext[parts[0]] instanceof Function) {
          this.guiContext[parts[0]].apply(this.guiContext, parts.slice(1));
        }
      }.bind(this);
    },
    getElementById: function getElementById(id) {
      return this.canvg.Definitions[id];
    }
  });

  var FADE_MOVE = 50;
  var FADE_TIME = 500;

  var GuiContext = util.extend(Object, 'GuiContext', {
    constructor: function GuiContext(menu) {
      this.menu = menu;
    },
    actionChangeState: function actionChangeState(newState) {
      this.menu.game.state.start(newState);
    },
    fade: function fade(isOut, isUp, newState) {
      var direction = isUp[0] == 'u' || isUp[0] == 'U' ? -1 : 1;
      var out = isOut[0] == 'o' || isOut[0] == 'O';
      var tween = this.menu.game.add.tween(this.menu.sprite);
      this.menu.sprite.alpha = out ? 1 : 0;
      tween.to({
        y: out ? this.menu.sprite.y + direction * FADE_MOVE : 0,
        alpha: out ? 0 : 1
      }, FADE_TIME);
      this.menu.sprite.position.y -= out ? 0 : direction * FADE_MOVE;
      if(out) {
        tween.onComplete.add(this.actionChangeState.bind(this, newState));
      }
      tween.start();
    }
  });

  return {
    Menu: Menu,
    GuiContext: GuiContext
  };
});
