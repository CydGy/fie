const fs = require('fs');
const crypto = require('crypto');
const bytes = require('./bytes.js');


module.exports = function (argv) {

  var nbytes = bytes.formatToBytes(argv.size);

  if (nbytes < 1) {
    console.error("Error : the size must be superior to 1 byte.");
    process.exitCode = 1;
    return;
  }

  if (argv.RNG === true ) {

    console.log("Error, function not coded yet.");

  } else {

    const writer = fs.createWriteStream("./SECRET-RANDOM-BYTES.bin", {
        flags: 'wx', // fails if the path exists
        encoding: null,
        autoClose: true,
        emitClose: true
      }
    );

    writer.on('error', (err) => {
      if (err.code === 'EEXIST')
        console.error("Error : A SECRET-RANDOM-BYTES.bin file already exists in the"
          + " current directory.");
      else throw err;
    });

    writer.on('close', () => {
      console.log("SECRET-RANDOM-BYTES.bin file has been successfully generated with"
        + " %s of pseudo-random bytes.", bytes.format(writer.bytesWritten, true));
    });

    writer.on('ready', () => {
      let nblock = (nbytes <= 4096) ? nbytes : 4096;
      // rounds a number up to the next largest integer
      let nloop = Math.ceil(nbytes / 4096); 
      let nlastblock = ((nbytes / 4096) % 1 != 0) ? (nbytes - (nloop-1) * 4096) : 0;
      writing((nbytes <= 4096) && nlastblock || nblock, nloop, nlastblock);
    });

    function writing (nblock, nloop, nlastblock) {

      crypto.randomBytes(nblock, function (err, pseudoRandomBytes) {
        if (err) throw err;
        writer.write(pseudoRandomBytes, null, () => {

          nloop--;

          if (nloop === 0) writer.end();

          else {

            // If there is one last write, set the correct block size
            if (nloop === 1 && nlastblock > 0) nblock = nlastblock;
            writing(nblock, nloop, nlastblock);

          }
        });
      });
    }

  }

};
