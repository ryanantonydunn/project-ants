
#!/bin/bash

kill $(ps aux | grep node | grep .js | awk '{print $2}')

rm -rf /home/ubuntu/project-ants/
git clone -b public https://gitlab-ci-token:w_5kFRhy_mJRQFe_fNrJ@gitlab.com/ryanantonydunn/project-ants.git

source /home/ubuntu/.nvm/nvm.sh

pm2 kill
npm remove pm2 -g
npm install pm2 -g
pm2 status

# install it all
cd /home/ubuntu/project-ants
npm install
npm run build:production

# run
nohup npm run start:production:$1