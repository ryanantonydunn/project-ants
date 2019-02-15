
# setup
# -------------

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install node
npm i pm2 -g
sudo apt-get install python
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
mkdir geolocation && cd geolocation
npm i express && npm i geoip-lite && npm i geolib
touch index.js && vi index.js
# paste index.js
nohup node index.js


# change
# -------------

kill $(ps aux | grep node | grep .js | awk '{print $2}')
pm2 kill
npm remove pm2 -g
npm install pm2 -g
pm2 status
cd /home/ubuntu/geolocation && rm index.js && touch index.js && vi index.js
# paste index.js
nohup node index.js