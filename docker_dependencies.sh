#!/usr/bin/env bash
docker rm -f pubsub
docker pull xtrctio/pubsub-emulator:latest

docker run -d --name pubsub -p 8681:8681 xtrctio/pubsub-emulator:latest
