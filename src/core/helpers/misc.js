/* ========================================================================
    Misc Functions
 ========================================================================== */

/* Duplicate object
	---------------------------------------- */

function duplicate_obj(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* Prevent array merging
	---------------------------------------- */

function dont_merge(destination, source) {
  if (!source) {
    return destination;
  } else {
    return source;
  }
}

/* Add space to a string
	---------------------------------------- */

function str_space(str) {
  var new_str = "";
  for (var i = 0; i < str.length; i++) {
    var add = i == str.length - 1 ? "" : "\u200A";
    new_str += str[i] + add;
  }
  return new_str;
}

/* Log multiple values
	---------------------------------------- */

function clog(
  s1,
  s2,
  s3,
  s4,
  s5,
  s6,
  s7,
  s8,
  s9,
  s10,
  s11,
  s12,
  s13,
  s14,
  s15
) {
  var str = s1;
  if (s2 != undefined) {
    str += " | " + s2;
  }
  if (s3 != undefined) {
    str += " | " + s3;
  }
  if (s4 != undefined) {
    str += " | " + s4;
  }
  if (s5 != undefined) {
    str += " | " + s5;
  }
  if (s6 != undefined) {
    str += " | " + s6;
  }
  if (s7 != undefined) {
    str += " | " + s7;
  }
  if (s8 != undefined) {
    str += " | " + s8;
  }
  if (s9 != undefined) {
    str += " | " + s9;
  }
  if (s10 != undefined) {
    str += " | " + s10;
  }
  if (s11 != undefined) {
    str += " | " + s11;
  }
  if (s12 != undefined) {
    str += " | " + s12;
  }
  if (s13 != undefined) {
    str += " | " + s13;
  }
  if (s14 != undefined) {
    str += " | " + s14;
  }
  if (s15 != undefined) {
    str += " | " + s15;
  }
  console.log(str);
}
