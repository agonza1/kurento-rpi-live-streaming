docker stop $(docker ps -q)
docker rm $(docker ps -a -q)
docker build -t agonza1/kurento-rpi-streamer .
docker run -p 8443:8443 -d agonza1/kurento-rpi-streamer
docker logs --follow $(docker ps -q | awk '{print $1;}')
