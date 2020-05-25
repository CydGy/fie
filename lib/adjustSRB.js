const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const wipe = require("./wipe.js");
const bytes = require("./bytes.js");


module.exports = function (argv) {

  if (isNaN(argv.size)) {
    console.error("Error : Invalid number. Please write the file size in bytes.");
    process.exitCode = 1;
    return;
  }
  
  if (argv.size < 1) {
    console.error("Error : Invalid number. The file size must be above 1.");
    process.exitCode = 1;
    return;
  }

  fs.stat(argv.SRB, function (err, stats) {
    if (err) {
      if (err.code === "ENOENT") {
        console.error("Error : SECRET-RANDOM-BYTES.bin file does not exist.");
        process.exitCode = 1;
        return;
      } else  throw err;
    }
    
    if (stats.size < 2) {
      console.error("Error : The current size of the file cannot be reduced.");
      process.exitCode = 1;
      return;
    }
    
    if (argv.size >= stats.size) {
      console.error("Error : the new file size must be inferior compared to the current size of SECRET-RANDOM-BYTES.bin");
      process.exitCode = 1;
      return;
    }

    // Checking

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });


    // see Template literals (Mozilla)
    rl.question(`Are you sure to set the new size to ${argv.size} bytes${
        argv.size < 1024 
        ? ""
        : " (" + bytes.format(argv.size, true) + ")"
      }? (yes/no) : `, (answer) => {

      rl.close();

      if (answer !== "yes") return console.log("OK, aborting."); // Even when no verbose mode

    
      // Wiping
      
      var nbytes = stats.size - argv.size;
      
      wipe({
        'RNG': argv.RNG,
        'writer_file': argv.SRB,
        'epool_file': argv.epool,
        'position': argv.size,
        'nbytes': nbytes,
        'verbose': argv.verbose,
        'autoremove': argv.autoremove
      }, function (nb_bytes_overwritten) {
      
        if (argv.verbose) {
          console.log("%s has been reduced to the new file size of %d bytes.", argv.SRB, argv.size);
          console.log("The %d unused bytes have been overwritten with %s bytes.", nb_bytes_overwritten, (argv.RNG && "random" || "pseudo-random"));
        }
        console.log("SUCCESS"); // Even when no verbose mode
        
        
      });
    });
  });
  
};
