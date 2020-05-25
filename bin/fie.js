#!/usr/bin/env node

const yargs = require('yargs');

const encrypt = require("../lib/encrypt.js");
const decrypt = require("../lib/decrypt.js");
const adjustSRB = require("../lib/adjustSRB.js");
const generateSRB = require("../lib/generateSRB.js");


// see Variadic Positional Arguments

// Arguments

const argv = yargs
  .scriptName("fie")
  .usage("$0 <cmd> [args]")
  
  // Commands
  
  .command('encrypt <path>', "Encrypt a file.", (yargs) => {
    yargs.positional('path', {
      description: "The path of the file to encrypt.",
      type: 'string',
      normalize: true
    })
  }, function (argv) {
    encrypt(argv);
  })
  
  .command('decrypt <path>', "Decrypt a file.", (yargs) => {
    yargs.positional('path', {
      description: "The path of the file to decrypt.",
      type: 'string',
      normalize: true
    })
  }, function (argv) {
    decrypt(argv);
  })
  
  .command('adjustSRB <size>', "Adjust the file size of SECRET-RANDOM-BYTES.bin.", (yargs) => {
    yargs.positional('size', {
      description: "The new file size (in bytes) to adjust SECRET-RANDOM-BYTES.bin file.", 
      type: 'number'
    })
  }, function (argv) {
    adjustSRB(argv);
  })

  .command('generateSRB <size>', "Generate a new SECRET-RANDOM-BYTES.bin file.", (yargs) => {
    yargs.positional('size', {
      description: "Size (e.g. 80, 100KiB, 80MiB).",
      type: 'string'
    })
  }, function(argv) {
    generateSRB(argv);
  })
  
  // Options
  
  .option('verbose', {
    alias: 'v',
    description: "Run with verbose logging.",
    type: 'boolean',
    default: false
  })
  
  .option('RNG', {
    description: "Overwrite with random bytes (default: false).",
    type: "boolean",
    default: false
  })
  
  .option('PRNG', {
    description: "Overwrite with pseudo-random bytes (default: true).",
    type: "boolean",
    default: true
  })
  
  .option('entropy-pool', {
    alias: 'epool',
    description: "When used with --RNG, indicates the path to the file containing the random bytes (default: /dev/random).",
    type: "string",
    default: "/dev/random",
    normalize: true
  })

  .option('autoremove', {
    description: "Wipe as well the bytes of the entropy-pool file with pseudo-random bytes (default: false)",
    type: "boolean",
    default: false
  })

  .option('autoremove-RNG', {
    description: "Wipe as well the bytes of the entropy-pool file using /dev/random (default: false)",
    type: "boolean",
    default: false
  })
  
  .option('SRB', {
    description: "The path of the file where the secret random bytes are (default: ./SECRET-RANDOM-BYTES.bin).",
    type: "string",
    default: "./SECRET-RANDOM-BYTES.bin",
    normalize: true
  })
  
  .option('ncof', {
    description: "The number of pseudo-random characters for the output filename.",
    type: "number",
    default: 30,
    normalize: true
  })
  
  .demandCommand(1, "Error : you need at least one command.")
  .help()
  .alias("help", "h")
  .strict(true)
  .argv;



