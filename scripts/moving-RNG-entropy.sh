#! /bin/sh

# Run a sound in background
# mplayer /home/cydgy/sounds/romulan_computerbeep2.mp3 </dev/null >/dev/null 2>&1 &

# For a single read of one block, /dev/random always return 114 or 115 bytes maximum.
# I do not know why but it is a fact...
# count 3 so read as much as possible without blocking too much
dd bs=115 count=3 if=/dev/random >> /home/cydgy/RNG-pool
mplayer /home/cydgy/sounds/romulan_computerbeep2.mp3
