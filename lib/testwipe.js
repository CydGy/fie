const wipe = require("./wipe.js");
const fs = require('fs');

var argv = {
  epool: "/dev/random",
  SRB: "./SECRET-RANDOM-BYTES.bin",
  RNG: true
};

wipe({
  'RNG': argv.RNG,
  'writer_file': argv.SRB,
  'epool_file': argv.epool,
  'position': 50,
  'nbytes': 100,
  'verbose': true
}, function (bytesWritten) {
  console.log("SUCCESS %d bytes written.", bytesWritten);
});
