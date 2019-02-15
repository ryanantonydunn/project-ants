
#!/bin/bash

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
nvm install node
npm i pm2 -g
sudo apt update
sudo apt-get update
sudo apt-get install python
sudo apt install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
sudo apt-add-repository ppa:izx/askubuntu
sudo apt-get install libnotify-bin
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000