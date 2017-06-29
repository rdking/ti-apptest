var appTest = require('../../appTest.js');
var mocha = require('mocha');
var should = require('should');

describe('ti-appTest', () => {
    it('should have a member function named "init"', () => {
        appTest.should.have.property('init').with.type("function");
        appTest.init(global);
        appTest.setPlatform(PLATFORMS.iPHONE);
    });
});
describe('global', () => {
    it('should have a member function named "Titanium"', () => {
        should(Titanium).have.type("function");
    });
    it('should have a member function named "Ti" equal to "Titanium', () => {
        should(Ti).have.type("function");
        should(Titanium).equal(Ti);
    });
    it('should have a member function named "Mock"', () => {
        should(Mock).have.type("function");
    });
    it('should have a member function named "require"', () => {
        should(require).have.type("function");
    });
});
describe('Ti', () => {
    it('should create a property called "UI" on demand', () => {
        var UI = Ti.UI;
        should(Ti).have.property("UI");
    });
});
describe("Ti.UI", () => {
    it('should be callable', () => {
        should(Ti.UI()).not.throw;
    });
    it('should create a property called "createView" on demand', () => {
        var createView = Ti.UI.createView;
        should(Ti.UI).have.property("createView");
    });
});
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
