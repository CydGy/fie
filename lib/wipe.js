const fs = require('fs');
const crypto = require('crypto');
const bytes = require("./bytes.js");

/**
 * Options
 *
 * {
 *   RNG
 *   writer_file
 *   epool_file
 *   position
 *   nbytes
 *   verbose
 *   autoremove
 * }
 *
 */

module.exports = function (opt, callback) {

  if (opt.RNG === true) {
  
    const reader = fs.createReadStream(opt.epool_file, {
        flags: "r",
        encoding: null,
        autoClose: true,
        emitClose: true,
        start: 0, // When will add autoremove option, will need to make another possible value.
        end: opt.nbytes - 1 // Both start and end are inclusive (reading from 0 to 99 gives 100 bytes.
      }
    );
    
    const writer = fs.createWriteStream(opt.writer_file, {
        flags: "r+", // Modifying a file rather than replacing it may require the flag option to be set to 'r+' rather than the default 'w'.
        encoding: null,
        autoClose: true,
        emitClose: true,
        start: opt.position
      }
    );
    
    
    /**
     * Errors
     */
     
    reader.on('error', (err) => {
      if (err.code === 'ENOENT') console.error("Error : '%s' no such file.", opt.epool_file);
      else {
        console.error("Error : overwriting failed.");
        throw err;
      }
    });
    
    writer.on('error', (err) => {
      console.error("Error : overwriting failed.");
      throw err;
    });
    
    /**
      * Starting
      */
     
    reader.on('ready', () => {
      if (opt.verbose) {
        console.log("Ready for overwriting. Using bytes from %s.", opt.epool_file);
        if (opt.epool_file === "/dev/random")
          console.log("(Doing search operation on large directories or moving the mouse in X slowly refills the entropy pool with true entropy.)");
      }
      process.stdout.write(getBar("Overwriting", writer.bytesWritten, opt.nbytes));
    });
    
    /**
     * Ending
     */
     
    reader.on('end', () => {
      writer.end();
    });

    writer.on('close', () => {

      process.stdout.write("\n");

      // Truncating
      fs.truncate(opt.writer_file, opt.position, function (err) {
        if (err) {
          console.error("Error : truncating failed.");
          throw err;
        }
        
        if (opt.autoremove && (opt.epool_file !== "/dev/random")) {

          /*
          if (opt.verbose) console.log('Autoremoving the random bytes used...');
          write({
            'RNG': opt.autoremove-RNG
            'writer_file': opt.epool_file, // CAN BE AN ACTIVE STREAM! HOW TO DO?
            'epool_file': null, // Autoremoving using /dev/random or /dev/urandom
            'position':
            'nbytes':
            'verbose': opt.verbose,
            'autoremove': null
          }, function () {
            callback(writer.bytesWritten);
          });
          */
          console.log("OPTION AUTOREMOVE CANNOT BE USED WITH THIS VERSION");
          callback(writer.bytesWritten);

        } else 
          callback(writer.bytesWritten);
      
      });
      
    });
    
    /**
      * data
      */

    reader.on('data', (chunk) => {
      let ok = writer.write(chunk, null, () => {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(getBar("Overwriting", writer.bytesWritten, opt.nbytes));
      });
    });
    
  
  } else {
    
    // Generate pseudo-random bytes
    crypto.randomBytes(opt.nbytes, function (err, pseudoRandom_bytes) {
      if (err) throw err;
      
      fs.open(opt.writer_file, 'r+', function (err, SRB_fd) {
        if (err) throw err;
        
        // fs.write(fd, buffer[, offset[, length[, position]]], callback)
        fs.write(SRB_fd, pseudoRandom_bytes, 0, opt.nbytes, opt.position, function (err, nb_bytes_overwritten) {
          if (err) {
            console.error("Error : overwriting failed.");
            throw err;
          }
          
          fs.truncate(opt.writer_file, opt.position, function (err) {
            if (err) {
              console.error("Error : truncating failed.");
              throw err;
            }
            
            callback(nb_bytes_overwritten);
          
          });
        });
      });
    });
  
  }
  
};


function getBar(title, bytesWritten, nbytes) {

  let current_progress = bytesWritten / nbytes; // from 0 to 1
  let percentage_progress = (current_progress * 100).toFixed(0); // from 0 to 100

  let str_bar = "";
  let str_beginning = title + " [";
  let str_end = "] " + percentage_progress + "% | "
    + bytes.format(bytesWritten, true) + " / "
    + bytes.format(nbytes, true);

  let bar_ncolumns = process.stdout.columns - str_beginning.length - str_end.length;

  // Setting minimum and maximum range for the bar size
  if (process.stdout.columns < 10) bar_ncolumns = 10;
  else if (process.stdout.columns > 100) bar_ncolumns = 100;

  let i;
  let bar_progress = (current_progress * bar_ncolumns).toFixed(0);

  for (i = 0 ; i < bar_ncolumns ; i++) {
    if (i < bar_progress) str_bar += "=";
    else str_bar += "-";
  }

  return str_beginning + str_bar + str_end;

}
