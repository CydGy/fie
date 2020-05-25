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

const fs = require('fs');
const crypto = require('crypto');
const wipe = require("./wipe.js");

var original_filename_output = undefined;
var original_filename_output_tried = false;


module.exports = function (argv) {

  if (argv.path === "SECRET-RANDOM-BYTES.bin") {
    console.error("Cannot encrypt SECRET-RANDOM-BYTES.bin.");
    process.exitCode = 1;
    return;
  }
  
  if (argv.verbose)
    console.log("Reading file '%s' for encryption...", argv.path);
  
  // Reading the bytes of the file we want to encrypt.
  fs.readFile(argv.path, {'encoding': null}, function (err, dataBuf) {
    if (err) {
      if (err.code === "ENOENT") {
        console.error("Error : No such file");
        process.exitCode = 1;
        return;
      } else  throw err;
    }
    
    var dataBufLength = dataBuf.length;
    var SRB_lengthToRead = dataBufLength + 2; // 2 bytes for RqRb
    
    // 97 is the decimal ASCII value for 'a'.
    // 0x61 is the hexadecimal ASCII value for 'a'.

    // dataBuf.toString('utf8')); dataBuf.toString('hex')); dataBuf.toJSON());
    
    if (argv.v) console.log("Size of the data to encrypt : %d bytes", dataBufLength);
    
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
        
        var SRB_fdSize = stats.size;
        if (argv.v) console.log("SRB size available : %d bytes", SRB_fdSize);
        
        var SRB_leftPosition = SRB_fdSize - SRB_lengthToRead;
        
        // Checking that there is enough SRB available.
        if (SRB_leftPosition < 0) {
          console.error("ERROR : There is not enough SRB available to decrypt the data.");
          process.exitCode = 1;
          return;
        }
        
        // Reading the file containing the SRB (raw buffer) to use during the encryption.
        if (argv.v) console.log("Taking %d bytes from SRB to use for encryption...", SRB_lengthToRead);
        var SRB_buf = Buffer.alloc(SRB_lengthToRead);
        fs.read(SRB_fd, SRB_buf, 0, SRB_lengthToRead, SRB_leftPosition, function (err, bytesRead,
        SRB_buf) {
          if (err) throw err;
          
          var RqRb1 = SRB_buf[SRB_buf.length - 2];
          var RqRb2 = SRB_buf[SRB_buf.length - 1];
          //console.log('RqRbs: ', RqRb1, RqRb2);
          var RqRb_length = RqRb1 + RqRb2;
          
          // Setting the for minimum size
          if (dataBufLength + RqRb_length < 100)
            RqRb_length = 100 - dataBufLength;

          /**
           * Notes :
           * Uint8Array typed array represents an array of 8-bit unsigned integers.
           * Instances of the Buffer class, and Uint8Arrays in general, are similar to arrays
           * of integers from 0 to 255.
           * Therefore, dataBuf[i] is a decimal value, not hexadecimal.
           * Use 'dataBuf[i], dataBuf.toString('hex', i, i+1)' to see the hexadecimal value.
           */
          
          // +6 : adding space for the SRB size
          var encryptedDataSize = dataBufLength + 6 + RqRb_length;
          var encryptedDataBuf = Buffer.alloc(encryptedDataSize); 
           
          // Adding the size of SRB file during the encryption.
          if (argv.v) console.log("Adding the size of the SRB file (written as 6 bytes).");
          // buf.writeUIntBE(value, offset, byteLength)
          // byteLenth max = 6 = 281474976710655 
          encryptedDataBuf.writeUIntBE(SRB_fdSize, 0, 6)
          
          // Encrypting
          if (argv.v) console.log("Encrypting each byte of the data... (%d bytes)", dataBufLength);
          var i, n;
          for (i = 0, n = 0 ; i < dataBufLength ; i++) {
            // Encrypting with an addition.
            n = dataBuf[i] + SRB_buf[i];  // Will not touch to the last two bytes of the SRB_buf
            if (n > 255) n = n - 256;
            encryptedDataBuf.writeUInt8(n, i + 6);// Skipping the bytes indicating the size of the SRB (6 bytes)
          }
          
          // When the loop exits, 1 is added to the variable 'i' 
          i = i + 6; // adding 6 to not overwrite the encrypted data with the RqRb
          
          // Creating the RqRb
          crypto.randomBytes(RqRb_length, function (err, RqRb) {
            if (err) throw err;
            
            // Adding the RqRb
           if (argv.v) console.log("Adding %d random bytes...", RqRb_length);
            for (var j = 0 ; j < RqRb_length ; j++, i++) {
              encryptedDataBuf.writeUInt8(RqRb[j], i);
            }
            
            // Putting the encrypted data into a new file with a filename giving no information.
            writeToFile(argv, encryptedDataBuf, function (filename_output) {
              
              console.log("Encrypted file (%d bytes) successfully created at '%s'", encryptedDataSize, filename_output);
             
              // Wiping
              wipe({
                'RNG': argv.RNG,
                'writer_file': argv.SRB,
                'epool_file': argv.epool,
                'position': SRB_leftPosition,
                'nbytes': SRB_lengthToRead,
                'verbose': argv.verbose,
                'autoremove': argv.autoremove
              }, function (nb_bytes_overwritten) {
          
                if (argv.verbose) {
                  // Verifying with bytesWritten (instead of using the variable SRB_lengthToRead)
                  console.log("The %d bytes used for encrypting have been overwritten with %s, and removed from SRB.", nb_bytes_overwritten, (argv.RNG && "random" || "pseudo-random"));
                  console.log("SRB size available : %d bytes", SRB_leftPosition);
                  console.log("SUCCESS");
                }

              });
            });
          })
        });
      });
    });
  });

};


function writeToFile(argv, encryptedDataBuf, callback) {
  
  var filename_output;
  
  if (original_filename_output && original_filename_output_tried === false)
    filename_output = original_filename_output;
  else
    filename_output = pseudoRandomFilename(argv.ncof) + ".encrypted";
  
  fs.writeFile(filename_output, encryptedDataBuf, {"encoding": null, "flag": 'wx'}, function (err) {
    if (err) {
      if (err.code === "EEXIST") {
        if (original_filename_output) original_filename_output_tried = true;
        writeToFile(encryptedDataBuf, callback);
      } else {
        console.error("ERROR : Creating the encrypted file failed."); 
        throw err;
      }
    } else callback(filename_output);
  });
  
}


function pseudoRandomFilename(length) {
   
   var result = "";
   var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
   
}


    /**
     * Encrypting in ISO-8859-1 (8 bits per characters / 1 byte)
     *
     * The reason to use this character set is that less memory
     * space will be needed to encrypt the same amount of letters.
     *
     * https://www.fileformat.info/info/charset/ISO-8859-1/list.htm
     *
     * Pure Javascript:
     * (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
     * > parseInt('ff', 16) // 255
     * > (255).toString(16) // 'ff'
     * > 'ÿ'.charCodeAt(0) // 255
     * > 'ÿ'.charCodeAt(0).toString(2) // '11111111'
     * > String.fromCharCode(255) // ÿ
     *
     *
     * 256 unique ways (including 0)
     */
