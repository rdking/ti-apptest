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
            console.log('Performing action!');
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
