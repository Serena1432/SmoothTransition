/*:
 * @plugindesc v1.0.0 - A plugin handling the smooth transitions for any games.
 * @author Serena1432
 *
 * @help -------------------------------------------------------------------------------
 * SmoothTransition
 * Made by Serena1432 (fb.me/Serena1432) (github.com/Serena1432)
 * You can use my plugins for any purposes, including commercial ones.
 * -------------------------------------------------------------------------------
 * I. Description
 * -------------------------------------------------------------------------------
 * This is the plugin for handling smooth transtions for any RPG Maker MV/MZ games
 * to improve the user experience, other than the sh!tty default "linear"
 * transitions from the game.
 * Currently the supported transition types are "linear", "easeIn", "easeOut",
 * "easeInOut", "easeInCubic", "easeOutCubic" and "easeInOutCubic".
 * -------------------------------------------------------------------------------
 * II. Usage
 * -------------------------------------------------------------------------------
 * You can read the plugin manual from this link down below:
 * https://github.com/Serena1432/SmoothTransition/blob/master/README.md#usage
 *
* @param Default Transition Type
 * @desc The default transition type that will be used for all transitions.
 * @type text
 * @default easeOut
* @param Overwrite Picture Transition
 * @desc Enable/disable overwriting the default picture transition in the game.
 * @type boolean
 * @default true
 */

/*
----------------------------------------------------------------------------
SmoothTransition
The class contains all functions for smooth transitioning.
----------------------------------------------------------------------------
*/

function SmoothTransition() {
    throw new Error("This is a static class");
}

SmoothTransition.parameters = PluginManager.parameters("SmoothTransition");
SmoothTransition.defaultTransitionType = SmoothTransition.parameters["Default Transition Type"];
SmoothTransition.overwritePictureTransition = (SmoothTransition.parameters["Overwrite Picture Transition"] == "true") ? true : false;

SmoothTransition.transitionTypes = {
    linear: function(value) {
        return value;
    },
    easeOut: function(value) {
        return Math.sin((value * Math.PI) / 2);
    },
    easeIn: function(value) {
        return 1 - Math.cos((value * Math.PI) / 2);
    },
    easeInOut: function(value) {
        return -(Math.cos(Math.PI * value) - 1) / 2;
    },
    easeOutCubic: function(value) {
        return 1 - Math.pow(1 - value, 3);
    },
    easeInCubic: function(value) {
        return value * value * value;
    },
    easeInOutCubic: function(value) {
        return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
    }
}

SmoothTransition.getValue = function(value, reverse = false, transitionType = SmoothTransition.defaultTransitionType) {
    var out = this.transitionTypes[transitionType] ? this.transitionTypes[transitionType](value) : null;
    return reverse ? (1 - out) : out;
}

SmoothTransition.processTransition = function(time, callback = (value) => {}, transitionType = SmoothTransition.defaultTransitionType) {
    var timestamp = new Date().getTime(),
        timeElapsed = 0;
    var interval = setInterval(function() {
        if (timeElapsed >= time) {
            clearInterval(interval);
            value = 1;
            callback(1);
            return;
        }
        var newTime = new Date().getTime();
        var dt = newTime - timestamp;
        timestamp = newTime;
        timeElapsed += dt;
        callback(SmoothTransition.getValue(timeElapsed / time, false, transitionType));
    });
    return interval;
}

SmoothTransition.parseVariable = function(input) {
    const pattern = /\\([A-Za-z])\[(\d+)\]/g;
    var match = pattern.exec(input), output = input;
    if (match && match[1].toLowerCase() == "v") output = output.replaceAll(match[0], $gameVariables.value(Number(match[2])).toString());
    return Number(output);
}

/*
----------------------------------------------------------------------------
Game_Picture overwrites
Overwrite the default functions for moving pictures
----------------------------------------------------------------------------
*/

var _movePicture = Game_Picture.prototype.move;
Game_Picture.prototype.move = function(origin, x, y, scaleX, scaleY, opacity, blendMode, duration) {
    if (SmoothTransition.overwritePictureTransition) {
        this._originalDuration = duration;
        this._originalX = this._x;
        this._originalY = this._y;
        this._originalScaleX = this._scaleX;
        this._originalScaleY = this._scaleY;
        this._originalOpacity = this._opacity;
    }
    _movePicture.call(this, origin, x, y, scaleX, scaleY, opacity, blendMode, duration);
}

var _updateMove = Game_Picture.prototype.updateMove;
Game_Picture.prototype.updateMove = function() {
    if (SmoothTransition.overwritePictureTransition) {
        if (this._duration > 0) {
            var value = SmoothTransition.getValue(1 - (this._duration / this._originalDuration), false, SmoothTransition.defaultTransitionType);
            this._x = this._originalX + ((this._targetX - this._originalX) * value);
            this._y = this._originalY + ((this._targetY - this._originalY) * value);
            this._scaleX = this._originalScaleX + ((this._targetScaleX - this._originalScaleX) * value);
            this._scaleY = this._originalScaleY + ((this._targetScaleY - this._originalScaleY) * value);
            this._opacity = this._originalOpacity + ((this._targetOpacity - this._originalOpacity) * value);
            this._duration--;
        } else {
            this._x = this._targetX;
            this._y = this._targetY;
            this._scaleX = this._targetScaleX;
            this._scaleY = this._targetScaleY;
            this._opacity = this._targetOpacity;
            delete this._originalDuration;
            delete this._originalX;
            delete this._originalY;
            delete this._originalScaleX;
            delete this._originalScaleY;
            delete this._originalOpacity;
        }
        return;
    }
    _updateMove.call(this);
};

/*
----------------------------------------------------------------------------
Game_Transition
The transition class to be saved into Game_Transitions container.
----------------------------------------------------------------------------
*/

function Game_Transition() {
    this.initialize.apply(this, arguments);
}

Game_Transition.prototype.initialize = function(id, variables, time, command, interpreter) {
    this._id = id;
    this._variables = variables || {};
    this._time = time || 0;
    this._command = command || "";
    this._interpreter = interpreter;
    this._interval = null;
};

Game_Transition.prototype.value = function(name) {
    return this._variables[name];
}

Game_Transition.prototype.setValue = function(name, start, end) {
    this._variables[name] = {
        start: SmoothTransition.parseVariable(start),
        end: SmoothTransition.parseVariable(end)
    };
}

Game_Transition.prototype.time = function() {
    return this._time;
}

Game_Transition.prototype.setTime = function(value) {
    this._time = value;
}

Game_Transition.prototype.command = function() {
    return this._command;
}

Game_Transition.prototype.setCommand = function(command) {
    this._command = command;
}

Game_Transition.prototype.interpreter = function() {
    return this._interpreter;
}

Game_Transition.prototype.setInterpreter = function(interpreter) {
    this._interpreter = interpreter;
}

Game_Transition.prototype.start = function() {
    var transition = this;
    if (!this._time) throw new Error(`SmoothTransition: The time in transition ID ${this._id} is not set`);
    if (!this._command) throw new Error(`SmoothTransition: The command in transition ID ${this._id} is not set`);
    if (!this._interpreter) throw new Error(`SmoothTransition: The interpreter in transition ID ${this._id} is not set`);
    if (this._interval) return;
    this._interval = SmoothTransition.processTransition(this._time * (1000 / 60), (value) => {
        var cmdArr = transition._command.split(" ");
        var variables = {};
        for (var i = 0; i < cmdArr.length; i++) {
            var cmd = cmdArr[i];
            var variable = transition._variables[cmd];
            if (variable) {
                if (!variables[cmd]) {
                    var start = variable.start, end = variable.end;
                    if (isNaN(start)) throw new Error(`SmoothTransition: The starting value of variable ${cmd} in transition ID ${transition._id} is not a number (NaN), please check the initial value/formula and try again`);
                    if (isNaN(end)) throw new Error(`SmoothTransition: The ending value of variable ${cmd} in transition ID ${transition._id} is not a number (NaN), please check the initial value/formula and try again`);
                    var variableValue = start + ((end - start) * value);
                    if (isNaN(variableValue)) throw new Error(`SmoothTransition: The output value of variable ${cmd} in transition ID ${transition._id} is not a number (NaN), please check the initial value/formula and try again`);
                    variable[cmd] = variableValue.toString();
                }
                cmdArr[i] = variable[cmd];
            }
        }
        var commands = cmdArr.join(" ").split(" | ");
        for (var i = 0; i < commands.length; i++) {
            var args = commands[i].split(" ");
            var command = args.shift();
            if (command && args.length) transition._interpreter.pluginCommand(command, args);
        }
    }, SmoothTransition.defaultTransitionType);
}

Game_Transition.prototype.stop = function() {
    if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
    }
}

Game_Transition.prototype.clear = function() {
    this._interpreter = null;
    this._command = "";
    this._variables = {};
    this._time = 0;
}

/*
----------------------------------------------------------------------------
Game_Transitions
The transition container class to be saved into $gameVariables object.
----------------------------------------------------------------------------
*/

function Game_Transitions() {
    this.initialize.apply(this, arguments);
}

Game_Transitions.prototype.initialize = function() {
    this._transitions = {};
}

Game_Transitions.prototype.transition = function(id) {
    return this._transitions[id];
}

Game_Transitions.prototype.setTransition = function(id, {variables, time, command, interpreter}) {
    var transition = this._transitions[id];
    if (!transition) this._transitions[id] = new Game_Transition(id, variables, time, command, interpreter);
    else {
        transition._variables = variables;
        transition._time = time;
        transition._command = command;
        transition._interpreter = interpreter;
    }
}

Game_Transitions.prototype.clear = function() {
    this._transitions = {};
}

Game_Transitions.prototype.createEmpty = function(id) {
    this.setTransition(id, {
        variables: {},
        time: 0,
        command: "",
        interpreter: null
    });
}

/*
----------------------------------------------------------------------------
Game_Interpreter overwrites
Overwrites the Plugin Commands.
----------------------------------------------------------------------------
*/

var _smoothTransition_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    if (command.toLowerCase() == "smoothtransition") {
        if (!$gameVariables.transitions) $gameVariables.transitions = new Game_Transitions();
        var transitions = $gameVariables.transitions;
        switch (args[0].toLowerCase()) {
            case "picture": {
                SmoothTransition.overwritePictureTransition = (args[1].toLowerCase() == "on") ? true : false;
                break;
            }
            case "variable": {
                var transitionId = Number(args[1]);
                if (!transitions.transition(transitionId)) transitions.createEmpty(transitionId);
                var transition = transitions.transition(transitionId);
                transition.setValue(args[2], args[3], args[4]);
                break;
            }
            case "time": {
                var transitionId = Number(args[1]);
                if (!transitions.transition(transitionId)) transitions.createEmpty(transitionId);
                var transition = transitions.transition(transitionId);
                transition.setTime(Number(args[2]));
                break;
            }
            case "cmd":
            case "command": {
                var transitionId = Number(args[1]);
                if (!transitions.transition(transitionId)) transitions.createEmpty(transitionId);
                var transition = transitions.transition(transitionId);
                transition.setCommand(args.slice(2).join(" "));
                break;
            }
            case "start": {
                var transitionId = Number(args[1]);
                if (!transitions.transition(transitionId)) transitions.createEmpty(transitionId);
                var transition = transitions.transition(transitionId);
                transition.setInterpreter(this);
                transition.start();
                this.wait(transition.time());
                break;
            }
            case "stop": {
                var transitionId = Number(args[1]);
                if (!transitions.transition(transitionId)) transitions.createEmpty(transitionId);
                var transition = transitions.transition(transitionId);
                transition.stop();
                break;
            }
            case "clear": {
                switch (args[1].toLowerCase()) {
                    case "all": {
                        transitions.clear();
                        break;
                    }
                    default: {
                        var transitionId = Number(args[1]);
                        var transition = transitions.transition(transitionId);
                        if (transition) transition.clear();
                        break;
                    }
                }
                transition.stop();
                break;
            }
        }
        return;
    }
    _smoothTransition_pluginCommand.call(this, command, args);
}