"use strict";

var page = require('webpage').create(),
  system = require('system'),
  address, output, size, pageWidth, pageHeight, key, scale;
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.1 Safari/603.1.30';

if (system.args.length !== 5) {
  phantom.exit(1)
} else {
  address = system.args[1];
  output = system.args[2];
  var pageWidth = parseInt(system.args[3], 10),
      pageHeight = parseInt(pageWidth * 3/4, 10);
  page.viewportSize = { width: pageWidth, height: pageHeight };
  scale = parseInt(system.args[4], 10);

  page.onConsoleMessage = function(message) {
    console.log(message);
  };

  page.open(address, function(status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
        phantom.exit(1);
    } else {
      if (scale > 1) {
        page.evaluate(function(scale) {
          /* scale the whole body */
          document.body.style.webkitTransform = "scale("+ scale + ")";
          document.body.style.webkitTransformOrigin = "0% 0%";
          /* fix the body width that overflows out of the viewport */
          document.body.style.width = Math.floor(100 / scale) + "%";
        }, scale)
      }
      window.setTimeout(function() {
        page.render(output);
        phantom.exit();
      }, 2000);
    }
  });
}
