ti-apptest
==========

This is a simple test harness designed to allow a developer to perform unit
tests on Titanium applications without the need to go through the pain of
having to run the application. It works by providing a Mock interface for
for the Titanium/Ti namespace. The Mock object then dynamically creates the
required API endpoints as they're requested. While this alone doesn't get you
much, setting up Mock rules will fill in the missing functionality by alowing
the developer to specify the action to be performed when a Mock object is used.

Example
-------
ti-apptest is a dog-fooded harness. It only made sense that the harness should
be useful in testing itself. As such, the best example of how to use this
harness is in ${modulePath}/test/specs/test.js. However, for the sake of
simplicity, here's a short example based on that file.

```
var appTest = require('ti-apptest');
var mocha = require('mocha');
var should = require('should');

//Let ti-apptest register a few things.
appTest.init(global);

/* If your test scripts were required in, then you'll probably want to
   uncomment the following line to make sure require follows the same behavior
   as in Titanium.
 */
//require = global.require

describe('Ti.UI.createView', () => {
    it('should be callable', () => {
        should(Ti.UI.createView()).not.throw;
    });
    it('should return an object if mocked into doing so', () => {
        Mock.when(Ti.UI.createView).isCalled.then.onlyOnce.performAction(function testAction(params) {
            var retval = Object.create(params);
            retval.test = "Success!";
            return retval;
        }).and.performDefaultAction;
        var response = Ti.UI.createView({width: 10, height: 20});
        should(response).have.property("test");
        should(response).have.property("width");
        should(response).have.property("height");
        should(response.test).equal("Success!");
        should(response.width).equal(10);
        should(response.height).equal(20);
    });
});
describe('Mocking an existing object with functions', () => {
    var testObj;
    var mockery;
    before(function() {
        testObj = {
            testSymbol: Symbol(),
            testFn: function() { 
                return this.testSymbol;
            }
        };
        mockery = new Mock(testObj);
    });
    it('should have a Symbol property called "testSymbol"', () => {
        should(mockery).have.property("testSymbol").with.type("symbol");
    });
    it('should have a function property called "testFn"', () => {
        should(mockery).have.property("testFn").with.type("function");
    });
    describe("testFn", () => {
        it('should return testObj.testSymbol when called', () => {
            should(mockery.testFn()).equal(testObj.testSymbol);
        });
        it('should be overrideable with a Mock rule', () => {
            Mock.when(mockery.testFn).isCalled.then.performAction(function testOverride() {
                console.log("Successfully overridden!");
                return this;
            });
            should(mockery.testFn()).equal(mockery);
        });
    })
});
```

Limitations
-----------
Because mocked object automatically create new proxies for all referenced
properties, passive references on Mocked objects that are expected to return
`undefined` will instead return a newly created Mock object. Unfortunately,
there is presently no means of detecting attempts to extend an undefined value.