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
                return Object.getPrototypeOf(target);
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
                return Object.setPrototypeOf(target, prototype);
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
                return Object.isExtensible(target);
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
                return Object.preventExtensions(target);
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
                return Object.getOwnPropertyDescriptor(target, name);
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
                return Object.defineProperty(target, name, descriptor);
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
                return (name in target);
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
                if (!(name in target)) {
                    if (typeof(name) == "symbol")
                        target[name] = new Mock(function (){});
                    else
                        target[name] = new Mock(eval(`(function ${name}(){})`));
                }
                
                retval = target[name];

                if (typeof(name) != "symbol")
                    console.log(`target["${name}"] = ${retval}`)

                return retval;
            }

            retval = processTests({
                target: target,
                name: name,
                testName: 'get',
                action: actionGet
            });

            return retval;
        },
        set: function(target, name, value, receiver) {
            function actionSet() {
                target[name] = value;
            }
            
            return processTests({
                target: target, 
                name: name, 
                testName: 'set',
                action: actionSet
            });
        },
        deleteProperty: function(target, name) {
            function actionDeleteProperty() {
                delete target[name];
            }

            return processTests({
                target: target,
                name: name,
                testName: 'deleteProperty',
                action: actionDeleteProperty
            });
        },
        ownKeys: function(target) {
            function actionOwnKeys() {
                return Object.getOwnPropertyNames(target);
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
                return target.apply(thisArg, argList);
            }

            return processTests({
                target: target, 
                name: target.name,
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
                var retval = Object.create(target.prototype);
                var response = target.apply(retval, argList);
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
    return class Mock {
        /**
         * Constructor function for Mock
         * @param {Object} obj - The object being mocked.
         */
        constructor(obj) {
            if (!obj instanceof Object)
                throw new TypeError("Primitives cannot be mocked!");

            var self = new Proxy(obj, proxyHandlers);
            this.target = obj;
            privateScope.set(obj, {
                mock: this,
                tests: {},
            });
            privateScope.set(self, privateScope.get(obj));
            return self;
        }

        static when(mockObj) {
            var newTest;
            var scope = privateScope.get(mockObj);

            if (scope && (scope.mock instanceof Mock)) {
                var newTest = new MockTest({
                    mock: mockObj,
                    key: scope.mock.target.name,
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
