var gulp = require("gulp");
var notify = require("gulp-notify");
var util = require("gulp-util");
var replace = require("gulp-string-replace");

// js modules
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");
var obfuscator = require("gulp-js-obfuscator");

// css modules
var sass = require("gulp-sass");
var autoprefixer = require("gulp-autoprefixer");
var minifyCss = require("gulp-minify-css");

// sprite modules
var spritesmith = require("gulp.spritesmith");
var buffer = require("vinyl-buffer");
var imagemin = require("gulp-imagemin");
var merge = require("merge-stream");

// assets output path
var build = "public";
var assets = "public/assets";
var src = "src";

// are we in production
const production = !!util.env.production;

/* Image Sprites
    ---------------------------------------- */

var src_sprites = src + "/sprites/**/*.png";

gulp.task("sprites", function() {
  var sprite = gulp.src(src_sprites).pipe(
    spritesmith({
      imgName: "sprites.png",
      cssName: "sprites.json",
      cssTemplate: function(data) {
        var str = "{\n";
        data.sprites.forEach(function(sprite, i) {
          var name = sprite.name.toLowerCase();
          str += "\t" + '"' + name + '"' + ": {\n";
          str += "\t\t" + '"size": ' + sprite.width + ",\n";
          str += "\t\t" + '"x": ' + sprite.x + ",\n";
          str += "\t\t" + '"y": ' + sprite.y + "\n";
          str += i == data.sprites.length - 1 ? "\t}\n" : "\t},\n";
        });
        str += "}";
        return str;
      }
    })
  );

  // save images
  var img_stream = sprite.img
    .pipe(buffer())
    .pipe(imagemin())
    .pipe(gulp.dest(assets + "/images/sprites"));

  // save json config files
  var css_stream = sprite.css.pipe(gulp.dest(src + "core/config"));

  // merge streams
  return merge(img_stream, css_stream).pipe(
    notify({
      title: "Image Sprites",
      message: "Compiled successfully"
    })
  );
});

/* SASS
	---------------------------------------- */

var src_sass = src + "/sass/style.scss";
gulp.task("sass", function() {
  return gulp
    .src(src_sass)
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(autoprefixer("last 2 versions"))
    .pipe(production ? minifyCss() : util.noop())
    .pipe(gulp.dest(assets + "/css"))
    .pipe(
      !production
        ? notify({
            title: "SASS",
            message: "Compiled successfully"
          })
        : util.noop()
    );
});
gulp.task("sass_watch", function() {
  gulp.watch(src + "/sass/**/*.scss", ["sass"]);
});

/* JS Client
	---------------------------------------- */

var clientSrc = ["core", "client"].map(
  folder => src + "/" + folder + "/**/*.js"
);
gulp.task("client", function() {
  return gulp
    .src(clientSrc)
    .pipe(production ? util.noop() : sourcemaps.init())
    .pipe(concat("app.js"))
    .pipe(production ? util.noop() : sourcemaps.write())
    .pipe(production ? obfuscator() : util.noop())
    .pipe(gulp.dest(assets + "/js"))
    .pipe(
      !production
        ? notify({
            title: "Client JS",
            message: "Compiled successfully"
          })
        : util.noop()
    );
});

gulp.task("client_watch", function() {
  gulp.watch(clientSrc, ["client"]);
});

/* JS Server
    ---------------------------------------- */

var serverSrc = ["core", "server"].map(
  folder => src + "/" + folder + "/**/*.js"
);
gulp.task("server", function() {
  return gulp
    .src(serverSrc)
    .pipe(concat("server.js"))
    .pipe(gulp.dest(build))
    .pipe(
      !production
        ? notify({
            title: "JS - Server",
            message: "Compiled successfully"
          })
        : util.noop()
    );
});
gulp.task("server_watch", function() {
  gulp.watch(serverSrc, ["server"]);
});

/* Default Tasks
    ---------------------------------------- */

gulp.task("default", [
  "sass",
  "sass_watch",
  "server",
  "server_watch",
  "client",
  "client_watch"
]);

gulp.task("build", ["sass", "server", "client"]);
