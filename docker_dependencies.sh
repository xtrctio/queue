#!/usr/bin/env bash
docker rm -f pubsub
docker pull messagebird/gcloud-pubsub-emulator:latest

docker run -d --name pubsub -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest
