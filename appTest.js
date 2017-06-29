'use strict';
/**
 * An isolating tool used to remove non-relevant portions of code from
 * consideration within the code being tested.
 * 
 * @class Mock
 */
var Mock = (function createMock() {
    var privateScope = new WeakMap();

    function processTests(params) {
        var scope = privateScope.get(params.target);
        var testList = scope.tests[params.testName] || {};
        var tests = ((params.name !== undefined) && (params.name in testList)) ? testList[params.name] : [];
        var runDefault = true;
        var retval;

        if (tests.length === 0) {
            retval = params.action();
        }
        else {
            let keepTests = [];
            for (let i=0; i<tests.length; ++i) {
                let test = tests[i];
                let keepActions = [];

                for (let j=0; j<test.actions.length; ++j) {
                    let act = test.actions[j];
                    let action = (act.isDefault) ? params.action : act.fn;
                    let rval;

                    if ("actionParams" in params)
                        rval = action.apply(params.actionParams.thisArg, params.actionParams.argList);
                    else
                        rval = action();

                    if (!act.onlyOnce)
                        keepActions.push(act);
                    if (rval !== undefined)
                        retval = rval;
                }
                
                //Keep all actions not marked onlyOnce
                test.actions = keepActions;

                if (!test.conditionOnce)
                    keepTests.push(test);
            }

            //Keep all tests not makred with conditionOnlyOnce
            testList[params.name] = keepTests;
        }

        return retval;
    }

    /**
     * We need to mock the entire Titanium/Ti namespace, but there's really no good
     * way of doing that directly. The problem is that while there is a heirarchy
     * of API calls, some of those calls return TiProxy objects whose interface
     * cannot be retrieved easily, if at all.
     */
    var proxyHandlers = {
        getPrototypeOf: function (target) {
            function actionGetPrototypeOf() {
                var scope = privateScope.get(target);
                return Object.getPrototypeOf(scope.target);
            }

            return processTests({
                target: target,
                name: undefined,
                testName: 'getPrototypeOf',
                action: actionGetPrototypeOf
            });
        },
        setPrototypeOf: function (target, prototype) {
            function actionSetPrototypeOf() {
                var scope = privateScope.get(target);
                return Object.setPrototypeOf(scope.target, prototype);
            }

            return processTests({
                target: target,
                name: undefined,
                testName: 'setPrototypeOf',
                action: actionSetPrototypeOf
            });
        },
        isExtensible: function(target) {
            function actionIsExtensible() {
                var scope = privateScope.get(target);
                return Object.isExtensible(scope.target);
            }

            return processTests({
                target: target,
                name: undefined,
                testName: 'isExtensible',
                action: actionIsExtensible
            });
        },
        preventExtensions: function(target) {
            function actionPreventExtensions() {
                var scope = privateScope.get(target);
                return Object.preventExtensions(scope.target);
            }

            return processTests({
                target: target, 
                name: undefined, 
                testName: 'preventExtensions',
                action: actionPreventExtensions
            });
        },
        getOwnPropertyDescriptor: function(target, name) {
            function actionGetOwnPropertyDescriptor() {
                var scope = privateScope.get(target);
                return Object.getOwnPropertyDescriptor(scope.target, name);
            }

            return processTests({
                target: target,
                name: name,
                testName: 'getOwnPropertyDescriptor',
                action: actionGetOwnPropertyDescriptor
            });
        },
        defineProperty: function(target, name, descriptor) {
            function actionDefineProperty() {
                var scope = privateScope.get(target);
                return Object.defineProperty(scope.target, name, descriptor);
            }

            return processTests({
                target:target,
                name: name, 
                testName: 'defineProperty',
                action: actionDefineProperty
            });
        },
        has: function(target, name) {
            function actionHas() {
                var scope = privateScope.get(target);
                return (name in scope.target);
            }

            return processTests({
                target: target, 
                name: name, 
                testName: 'has',
                action: actionHas
            });
        },
        get: function(target, name, receiver) {
            var scope = privateScope.get(target);
            var retval;

            function actionGet() {
                if (!("scope" in target)) {
                    target.scope = {};
                }
                if (!(name in scope.target)) {
                    if (typeof(name) == "symbol")
                        scope.target[name] = eval(`(function (){})`);
                    else
                        scope.target[name] = eval(`(function ${name}(){})`);
                }
                
                if ((typeof(scope.target[name]) == "object") || (typeof(scope.target[name]) == "function")) {
                    if (!(name in target.scope)) {
                        target.scope[name] = new Mock(eval(scope.target[name]));
                    }
                    retval = target.scope[name];
                }
                
                if (retval === undefined) {
                    retval = scope.target[name];
                }

                return retval;;
            }

            if (name in Mock.prototype) {
                if (Mock.prototype[name] instanceof Function){
                    retval = Mock.prototype[name].bind(receiver);
                }
                else {
                    retval = Mock.prototype[name];
                }
            }
            else {
                retval = processTests({
                    target: target,
                    name: name,
                    testName: 'get',
                    action: actionGet
                });
            }

            return retval;
        },
        set: function(target, name, value, receiver) {
            return processTests(target, name, 'set', function actionSet() {
                var scope = privateScope.get(target);
                scope.target[name] = value;
            });
        },
        deleteProperty: function(target, name) {
            return processTests(target, name, 'deleteProperty', function actionDeleteProperty() {
                var scope = privateScope.get(target);
                delete scope.target[name];
            });
        },
        ownKeys: function(target) {
            function actionOwnKeys() {
                var scope = privateScope.get(target);
                return Object.getOwnPropertyNames(scope.target);
            }

            return processTests({
                target: target, 
                name: undefined, 
                testName: 'ownKeys', 
                action: actionOwnKeys
            });
        },
        apply: function(target, thisArg, argList) {
            var scope = privateScope.get(target);
            
            function actionApply() {
                return scope.target.apply(thisArg, argList);
            }

            return processTests({
                target: target, 
                name: scope.target.name,
                testName: 'apply',
                action: actionApply,
                actionParams: {
                    thisArg: thisArg,
                    argList: argList
                }
            });
        },
        construct: function(target, argList, receiver) {
            var scope = privateScope.get(target);
            
            function actionConstruct() {
                var scope = privateScope.get(target);
                var retval = Object.create(scope.target.prototype);
                var response = scope.target.apply(retval, argList);
                return (response === undefined) ? retval : response;
            }

            return processTests({
                target: target, 
                name: undefined, 
                testName: 'construct',
                action: actionConstruct
            });
        },
    };

    function extend(dest) {
        for (let i=1; i<arguments.length; i++) {
            let arg = arguments[i];
            if (arg === Function.prototype) {
                var names = Object.getOwnPropertyNames(arg);
                names.splice(names.indexOf('name'), 1);
                names.splice(names.indexOf('constructor'), 1);
                names.splice(names.indexOf('caller'), 1);
                names.splice(names.indexOf('arguments'), 1);
                for (let j=0; j<names.length; ++j) {
                    let name = names[j];
                    dest[name] = arg[name];
                }
            }
            else {
                for (let key in arg) {
                    if (arg.hasOwnProperty(key)) {
                        dest[key] = arg[key];
                    }
                }
            }
        }
    };

    /**
     * MockTest represents a single test instance.
     */
    class MockTest {
        constructor(param) {
            for (var key in param)
                this[key] = param[key];
        }

        get isCalled() {
            this.type = "apply";
            return this;
        }

        get isSet() {
            this.type = "set";
            return this;
        }

        get isRead() {
            this.type = "get";
            return this;
        }

        get isDeleted() {
            this.type = 'delete';
            return this;
        }

        withArgument(index, value) {
            if (!Array.isArray(this.arguments))
                this.arguments = [];

            this.arguments[index] = value;
            return this;
        }

        withArguments() {
            this.arguments = Array.prototype.slice.call(arguments);
            return this;
        }

        withValue(value) {
            this.value = value;
            return this;
        }

        get then() {
            var scope = privateScope.get(this.mock);
            if (!(this.type in scope.tests)) {
                scope.tests[this.type] = {};
            }
            var testType = scope.tests[this.type];
            if (!(this.key in testType)) {
                testType[this.key] = [];
            }
            testType[this.key].push(this);
            return this;
        }
        
        get conditionOnlyOnce() {
            this.conditionOnce = true;
            return this;
        }

        get onlyOnce() {
            this.once = true;
            return this;
        }

        performAction(action) {
            this.actions = this.actions || [];
            this.actions.push({ fn: action, onlyOnce: !!this.once });
            this.once = false;
            return this;
        }

        get and() {
            return this;
        }

        get performDefaultAction() {
            this.actions = this.actions || [];
            this.actions.push({ isDefault: true, onlyOnce: !!this.once });
            this.once = false;
            return this;
        }
    }

    /**
     * Mock class providing the ability to generate rules for various actions
     * taken against an object
     * 
     * @class Mock
     */
    return class Mock extends Function{
        /**
         * Constructor function for Mock
         * @param {Object} obj - The object being mocked.
         */
        constructor(obj) {
            super("");

            if (!obj instanceof Object)
                throw new TypeError("Primitives cannot be mocked!");

            var self = new Proxy(this, proxyHandlers);
            privateScope.set(this, {
                unproxy: this,
                target: obj,
                tests: {},
            });
            privateScope.set(self, privateScope.get(this));
            return self;
        }

        static when(target) {
            var newTest;
            var scope = privateScope.get(target);

            if (scope && (scope.unproxy instanceof Mock)) {
                var newTest = new MockTest({
                    mock: target,
                    key: scope.target.name,
                    runDefault: false
                });
            }
            else {
                throw Error("'target' must be created with 'new Mock'!");
            }
            
            return newTest;
        }
    };
})();

var rootPath = require('rootpath');
var path = require('path');
var fs = require('fs');
var npmRequire = require;
var os;
var basePath = process.cwd();

function tiRequire(mpath) {
    var retval;
    var context = path.join(basePath, 'Resources', os);
    console.log(process.cwd());

    //make sure all require attempts are relative to the project root.
    rootPath(context);

    //If this is an absolute path, accept it as-is.
    if (mpath[0] === path.delimiter) {
        retval = npmRequire(path.join(context, '.' + mpath));
    }
    if (mpath[0] === '.') {
        retval = npmRequire(mpath);
    }
    else {
        retval = npmRequire(path.join(context, mpath));
    }

    return retval;
}

exports.init = function initialize(scope) {
    var Titanium = new Mock({});
    Object.defineProperties(scope, {
        Titanium: {
            enumerable: true,
            value: Titanium
        },
        Ti: {
            enumerable: true,
            value: Titanium
        },
        Mock: {
            enumerable: true,
            value: Mock
        },
        require: {
            enumerable: true,
            value: tiRequire
        },
        OS_IOS: {
            enumerable: true,
            value: (os == 'iphone') || (os == 'ipad')
        },
        OS_ANDROID: {
            enumerable: true,
            value: os == 'android'
        },
        OS_WINDOWS:  {
            enumerable: true,
            value: os == 'windows'
        },
        PLATFORMS: {
            enumerable: true,
            value: Object.freeze({
                ANDROID: "android",
                iPHONE: "iphone",
                iPAD: "ipad",
                WINDOWS: "windows"
            })
        }
    });
};

exports.setPlatform = function setPlatform(platform) {
    os = platform;
};
