#!/bin/sh
#/etc/init.d/kurentoRpiStreamer:Start streaming WebRTC and publish WS server for control
### BEGIN INIT INFO
# Provides:     kurentoRpiStreamer
# Required-Start:       $all
# Required-Stop:
# Default-Start:        2 3 4 5
# Default-Stop:
# Short-Description: Start streaming WebRTC and publish WS server for control of service
# Description:
### END INIT INFO

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
export DISPLAY=:1

case "$1" in
start)
echo "starting..."
exec pkill chromium & forever stop kurentoRpiStreamer || {
sleep 10
exec 1>/var/log/kurentoRpiStreamer/startx.out 2>&1
exec sudo startx & forever start --uid kurentoRpiStreamer --sourceDir /home/codes/webrtc-rpi-streaming/rpi -l /var/log/kurentoRpiStreamer/forever.log -o /var/log/kurentoRpiStreamer/forever.out -a -d -v index.js && v4l2-ctl --set-ctrl=rotate=180
}
sleep 10
exec 1>/var/log/kurentoRpiStreamer/startx.out 2>&1
exec sudo startx & forever start --uid kurentoRpiStreamer --sourceDir /home/codes/webrtc-rpi-streaming/rpi -l /var/log/kurentoRpiStreamer/forever.log -o /var/log/kurentoRpiStreamer/forever.out -a -d -v index.js && v4l2-ctl --set-ctrl=rotate=180
;;
stop)
exec 1>/var/log/kurentoRpiStreamer/stop.out 2>&1
#checkChromium=$(ps –ef | grep –v grep | grep –c chromium-browser)
echo "stopping..."
sleep 1
exec pkill chromium & forever stop kurentoRpiStreamer
;;
*)
echo "Usage: /etc/init.d/kurentoRpiStreamer {start|stop}"
exit 1
;;
esac
exit 0
