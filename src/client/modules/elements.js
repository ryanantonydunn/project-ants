/* ========================================================================
	Element Functions
 ========================================================================== */

function element(props) {
  // create the element
  var type = props.type ? props.type : "div",
    el = document.createElement(type);

  // set properties
  if (props.id) {
    el.id = props.id;
  }
  if (props.src) {
    el.src = props.src;
  }
  if (props.intype) {
    el.type = props.intype;
  }
  if (props.class) {
    el.className = props.class;
  }
  if (props.text) {
    el.innerHTML = props.text;
  }
  if (props.value) {
    el.value = props.value;
  }
  if (props.data) {
    el.dataset.data = props.data;
  }
  if (props.placeholder) {
    el.placeholder = props.placeholder;
  }
  if (props.maxlength) {
    el.maxLength = props.maxlength;
  }
  if (props.href) {
    el.href = props.href;
  }

  return el;
}

function select(id) {
  return document.getElementById(id);
}

function hide(el) {
  el.style.display = "none";
}

function show(el) {
  el.style.display = "block";
}

function remove(el) {
  el.parentNode.removeChild(el);
}

function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function append(parent, child) {
  parent.appendChild(child);
}

function add_class(el, class_name) {
  var split = el.className.split(" ");
  if (!split.includes(class_name)) {
    split.push(class_name);
  }
  el.className = split.join(" ");
}

function remove_class(el, class_name) {
  var split = el.className.split(" "),
    i = split.indexOf(class_name);
  if (i != -1) {
    split.splice(i, 1);
  }
  el.className = split.join(" ");
}

function display_time(frames) {
  var secs = floor(frames / 30);
  var minutes = floor(secs / 60);
  var seconds = (secs - minutes * 60).toString();
  seconds = seconds.length < 2 ? "0" + seconds : seconds;
  return minutes + ":" + seconds;
}

function debug(s1, s2, s3, s4, s5, s6, s7, s8, s9, br) {
  var e = select("debug");
  if (br) {
    e.innerHTML += "<br>";
  } else {
    e.innerHTML = "";
  }
  if (s1 != undefined) {
    e.innerHTML += s1;
  }
  if (s2 != undefined) {
    e.innerHTML += " | " + s2;
  }
  if (s3 != undefined) {
    e.innerHTML += " | " + s3;
  }
  if (s4 != undefined) {
    e.innerHTML += " | " + s4;
  }
  if (s5 != undefined) {
    e.innerHTML += " | " + s5;
  }
  if (s6 != undefined) {
    e.innerHTML += " | " + s6;
  }
  if (s7 != undefined) {
    e.innerHTML += " | " + s7;
  }
  if (s8 != undefined) {
    e.innerHTML += " | " + s8;
  }
  if (s9 != undefined) {
    e.innerHTML += " | " + s9;
  }
}

function debugbr(s1, s2, s3, s4, s5, s6, s7, s8, s9) {
  debug(s1, s2, s3, s4, s5, s6, s7, s8, s9, true);
}
