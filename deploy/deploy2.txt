

CREATE A SECURITY GROUP
///////////////
  aws ec2 create-security-group --group-name devenv-sg --description "security group for development environment"
  sg-032dc0cb08ca7664b
  aws ec2 authorize-security-group-ingress --group-name devenv-sg --protocol tcp --port 22 --cidr 0.0.0.0/0

CREATE A KEY PAIR
///////////////
  aws ec2 create-key-pair --key-name devenv-key --query 'KeyMaterial' --output text > devenv-key.pem
  sudo chmod 400 devenv-key.pem

LAUNCH INSTANCE
///////////////
  aws ec2 run-instances --image-id ami-c7ab5fa0 --security-group-ids sg-032dc0cb08ca7664b --count 1 --instance-type t2.micro --key-name devenv-key --query 'Instances[0].InstanceId'
  i-0d70376601e51896f"

GET INSTANCE PUBLIC IP
///////////////
  aws ec2 describe-instances --instance-ids i-0d70376601e51896f" --query 'Reservations[0].Instances[0].PublicIpAddress'
  18.130.203.152

CONNECT TO IT
///////////////
  ssh -i devenv-key.pem ubuntu@18.130.203.152