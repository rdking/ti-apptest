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

/**
 * Now we need to make sure that the Alloy code has been converted to normal
 * Titanium code for all platforms.
 */
var tiapp = fs.readFileSync("tiapp.xml");
for (let key of ["ios", "android", "windows", "mobileweb"]) {
    let compile = true;

    //<target device="android">true</target>
    if (key == "ios") {
        let iosCompile = false;
        for (let device of ["iphone", "ipad"])
            iosCompile |= new RegExp(`^\\s*<target\\s*device\\s*=\\s*"${device}"\\s*>\\s*true\\s*<\/target>\\s*$`, "m").test(tiapp);

        compile &= iosCompile;
    }
    else {
        compile &= new RegExp(`^\\s*<target\\s*device\\s*=\\s*"${key}"\\s*>\\s*true\\s*<\/target>\\s*$`, "m").test(tiapp);
    }

    if (compile) {
        console.log(`Running Alloy for ${key} sources...`);
        try {
            execSync(`alloy compile --config platform=${key}`);
        }
        catch(e) {
            console.log(e.status);
        }
    }
}

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

