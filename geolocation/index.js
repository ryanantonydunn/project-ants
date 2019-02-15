var geoip = require("geoip-lite");
var geolib = require("geolib");
const app = require("express")();
const server = require("http").Server(app);

server.listen(3000);
app.get("/", (request, response) => {
  var ip =
    request.headers["x-forwarded-for"] || request.connection.remoteAddress;
  var location = checkIp(ip) || "uk";
  response.redirect("http://" + location + ".projectants.com/");
});

function checkIp(ip) {
  var geo = geoip.lookup(ip);
  var dist1 = geolib.getDistance(
    { latitude: geo.ll[0], longitude: geo.ll[1] },
    { latitude: 42.57177, longitude: -81.65397 }
  );
  var dist2 = geolib.getDistance(
    { latitude: geo.ll[0], longitude: geo.ll[1] },
    { latitude: 51.507351, longitude: -0.127758 }
  );
  return dist1 < dist2 ? "us" : "uk";
}
