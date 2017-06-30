'use strict'
var fs = require('fs');
var path = require('path');
var process = require('process');
const { execSync } = require('child_process');

/**
 * First thing we need to know for sure is whether or not we're in a Titanium
 * project directory. If we aren't, warn the user and bail.
 */
if (!fs.existsSync('tiapp.xml'))
    throw Error("ti-appTest must be run from a project directory!");

var specs = fs.readdirSync('specs');

for (let i=0; i<specs.length; ++i) {
    if (/^[^\.].+\.js$/.test(specs[i]))
        (function() {
            var basePath = process.cwd();
            var file = path.join(basePath, 'specs', specs[i]);
            console.log(`Running test "${file}"`);
            new Function("require", `require("${file}");`)(require);
        })();
}

