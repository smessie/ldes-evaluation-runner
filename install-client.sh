#!/bin/bash
# wget -O - -nv --ciphers DEFAULT@SECLEVEL=1 https://www.wall2.ilabt.iminds.be/enable-nat.sh | sudo bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22

cd client
npm install
npm run build
cd ..
