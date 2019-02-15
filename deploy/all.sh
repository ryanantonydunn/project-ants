
#!/bin/bash

ssh ubuntu@3.8.8.107 'bash -s' < ./deploy/deploy.sh "uk"
ssh ubuntu@54.158.111.94 'bash -s' < ./deploy/deploy.sh "us"