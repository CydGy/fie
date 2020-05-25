/**
 * Notes :
 *
 *  Acronyms :
 * - SRB = SECRET-RANDOM-BYTES
 * - SRB file = SECRET-RANDOM-BYTES.bin
 * - RqRb = random quantity of random bytes
 *
 * Structure for encryption :
 * - SRB : [ used for encrypting data ] + [2 bytes for RqRb] 
 * - FILE.encrypted : [SRB size (6 bytes)] + [AAAAAAAA (data)] + [RqRb]
 *
 * Information about encryption :
 * - Minimum total size : 100 bytes
 *
 * Number.MAX_SAFE_INTEGER = 9007199254740991 = SRB of 8388608 Gibibytes maximum.
 * buf.writeUIntBE() max length = 281474976710655 = SRB of 262143.99999999907 Gigibytes
 * maximum.
 */

/**
 * Command line:
 *
 * decrypt FILE 
 */
 
const fs = require('fs');
const crypto = require('crypto');
const wipe = require("./wipe.js");


module.exports = function (argv) {

  if (argv.path === "SECRET-RANDOM-BYTES.bin") {
    console.error("Cannot decrypt SECRET-RANDOM-BYTES.bin.");
    process.exitCode = 1;
    return;
  }

  // Reading the bytes of the file we want to decrypt.
  fs.readFile(argv.path, null, function (err, encryptedFileBuf) {
    if (err) {
      if (err.code === "ENOENT") {
        console.error("Error : No such file");
        process.exitCode = 1;
        return;
      } else  throw err;
    }
    
    var encryptedFileSize = encryptedFileBuf.length;
    if (argv.v) console.log("Size of the encrypted file : %d bytes", encryptedFileSize);
    
    // The encrypted data does not contain the first 6 bytes indicating the SRB size.
    var encryptedDataSizeWithRqRb = encryptedFileSize - 6;
    if (argv.v) console.log("Size of the total encrypted data : %d bytes", encryptedDataSizeWithRqRb);
      
    // Returning the integer representing the file descriptor, for reading and writing.
    fs.open('./SECRET-RANDOM-BYTES.bin', 'r+', function (err, SRB_fd) {
      if (err) {
        if (err.code === "ENOENT") {
          console.error("Error : SECRET-RANDOM-BYTES.bin file does not exist.");
          process.exitCode = 1;
          return;
        } else  throw err;
      }
      
      // Getting the size of the file to set the position starting from the end.
      fs.stat('./SECRET-RANDOM-BYTES.bin', function (err, stats) {
        if (err) throw err;
        
        var SRB_fd_CurrentSize = stats.size;
        if (argv.v) console.log("SRB size available : %d bytes", SRB_fd_CurrentSize);
        
        // Reading the other's SRB's size during encryption
        // buf.readUIntBE(offset, byteLength)
        var SRB_fd_sizeDuringEncryption = encryptedFileBuf.readUIntBE(0, 6);
        
        
        if (SRB_fd_sizeDuringEncryption > SRB_fd_CurrentSize) {
          
          console.error("ERROR : Decryption impossible.");
          console.error("ERROR : '%s' file have been encrypted with SRB which on this"
            + " computer have already been used and are lost.", argv.path);
          console.error("ERROR : Adjusting SRB size manually is recommended to make the communication work again.");
          process.exitCode = 1;
          return;
            
        }
        
        // Reading the 2 last bytes of the SRB file to know how many bytes of RqRb need to be trimmed.
        if (argv.v) console.log("Reading how many random bytes have been added...");
        var RqRb_2bytes = Buffer.alloc(2);
        // fs.read(fd, buffer, offset, length, position, callback)
        fs.read(SRB_fd, RqRb_2bytes, 0, 2, SRB_fd_sizeDuringEncryption - 2,
          function (err, bytesRead, RqRb_2bytes) {
          if (err) throw err;

          //console.log("RqRbs:", RqRb_2bytes[0], RqRb_2bytes[1]);
          
          var RqRb_length = RqRb_2bytes[0] + RqRb_2bytes[1];
          if (argv.v) console.log("%d random bytes have been added to the encrypted data.", RqRb_length);
          
          var encryptedDataSize = encryptedDataSizeWithRqRb - RqRb_length;
          if (argv.v) console.log("The size of the encrypted data is of %d bytes.", encryptedDataSize);
          
          // Setting the left position to read the SRB file.
          var SRB_leftPosition = SRB_fd_sizeDuringEncryption - encryptedDataSize - 2;
          
          
          // Checking that there is enough SRB available.
          if (SRB_leftPosition < 0) {
            console.error("ERROR : There is not enough SRB available to decrypt the data.");
            process.exitCode = 1;
            return;
          }
            
            
          // Reading the file containing the SRB (raw buffer) to use during the decryption.
          if (argv.v) console.log("Taking %d bytes from SRB to use for decryption...", encryptedDataSize);
          var SRB_buf = Buffer.alloc(encryptedDataSize);
          // fs.read(fd, buffer, offset, length, position, callback)
          // Not reading the 2 last bytes indicating RqRb (already done)
          fs.read(SRB_fd, SRB_buf, 0, encryptedDataSize, SRB_leftPosition, function (err, bytesRead,
          SRB_buf) {
            if (err) throw err;

            /**
             * Notes :
             * Uint8Array typed array represents an array of 8-bit unsigned integers.
             * Instances of the Buffer class, and Uint8Arrays in general, are similar to arrays
             * of integers from 0 to 255.
             * Therefore, msgBuf[i] is a decimal value, not hexadecimal.
             * Use 'msgBuf[i], msgBuf.toString('hex', i, i+1)' to see the hexadecimal value.
             */
             
            // Decrypting
            var decryptedDataBuf = Buffer.alloc(encryptedDataSize); // encryptedDataSize does not contain the 2 bytes of RqRb
            var decryptedDataLength = decryptedDataBuf.length;
            if (argv.v) console.log("Decrypting each byte of the data... (%d bytes)", encryptedDataSize);
            for (var i = 0, n = 0 ; i < decryptedDataLength ; i++) {
              // Decrypting with an substraction.
              n = encryptedFileBuf[i + 6] - SRB_buf[i]; // Skipping the bytes indicating the size of the SRB (6 bytes)
              if (n < 0) n = n + 256;
              decryptedDataBuf.writeUInt8(n, i);
            }

            // Setting the name for the new decrypted file
            var newFileName;
            var standardName = /\.encrypted$/.test(argv.path);
            if (standardName) 
              newFileName = argv.path.substring(0, argv.path.lastIndexOf("."));
            else
              newFileName = argv.path + ".decrypted";
              
            // Putting the decrypted data into a new file.
            fs.writeFile(newFileName, decryptedDataBuf, {"encoding": null}, function (err) {
              if (err) {
                console.error("ERROR : Creating the decrypted file failed."); 
                throw err;
              }
              
              if (argv.v) console.log("Decrypted data successfully created at '%s'", newFileName);
              
              /**
                * Wiping
                */
              
              var nbBytesToOverwrite = encryptedDataSize + 2; // adding the 2 last bytes indicating the RqRb
              if (SRB_fd_sizeDuringEncryption < SRB_fd_CurrentSize) {
                nbBytesToOverwrite = SRB_fd_CurrentSize - SRB_leftPosition;
              }
              
              wipe({
                'RNG': argv.RNG,
                'writer_file': argv.SRB,
                'epool_file': argv.epool,
                'position': SRB_leftPosition,
                'nbytes': nbBytesToOverwrite,
                'verbose': argv.verbose,
                'autoremove': argv.autoremove
              }, function (nb_bytes_overwritten) {
               
              
                if (argv.verbose) {
                  // Verifying with bytesWritten (instead of using the variable encryptedDataSize)
                  console.log("The %d bytes that was used by the other to encrypt the data have been randomly overwritten with %s, and removed from SRB.", nb_bytes_overwritten, (argv.RNG && "random" || "pseudo-random"));
                  console.log("SRB size available : %d bytes", SRB_leftPosition);
                  console.log("SUCCESS");
                }
                
                // WHY that : ???
                // Removing the file only if the name is standard.  
                //if (!standardName)
                //   return console.log("File %s has not been removed – END", argv.path);

                // Removing the file
                fs.unlink(argv.path, function (err) {
                  if (err) throw err;
                  if (argv.verbose) console.log("File '%s' has been removed.", argv.path);
                });
                    
              });
            });
          });
        });
      });
    });
  });

};


