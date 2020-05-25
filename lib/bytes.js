exports.format = function (bytes, add_multiple) {

  if (bytes <= 0) {
    if (add_multiple) return "0 byte";
    else return 0;
  } else if (bytes == 1) {
    if (add_multiple) return "1 byte";
    else return 1;
  }

  let multiples = ["bytes", "KiB", "MiB", "GiB", "TiB"];

  let current_multiple = Math.floor(Math.log(bytes) / Math.log(1024));
  if (current_multiple > 4) current_multiple = 4;

  let n = parseFloat((bytes / Math.pow(1024, current_multiple)).toFixed(2));

  if (add_multiple)
    n += " " + multiples[current_multiple];

  return n;

};


// 80, 80KiB, 80MiB, 80GiB, 80TiB
exports.formatToBytes = function (size) {

  if (!isNaN(size)) return parseInt(size, 10);

  let multiples = [1024, 1024*1024, 1024*1024*1024, 1024*1024*1024*1024];
  let current_multiple = size.substring(size.length - 3);
  let nbytes = parseInt(size, 10);

  if (current_multiple === "KiB") return nbytes * 1024;
  else if (current_multiple === "MiB") return nbytes * 1024 * 1024;
  else if (current_multiple === "GiB") return nbytes * 1024 * 1024 * 1024;
  else if (current_multiple === "TiB") return nbytes * 1024 * 1024 * 1024 * 1024;
  else return nbytes;

};
