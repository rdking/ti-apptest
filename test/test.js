'use strict'
var fs = require('fs');
var path = require('path');
var process = require('process');

//Change to the test directory. That's where the test code lives....
var prevDir = process.cwd();
process.chdir('test');

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
            require(path.join(process.cwd(), 'specs', specs[i]));
        })();
}

//Change directory back after we're done....
process.chdir(prevDir);