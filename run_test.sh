#!/usr/bin/env bash

# npm install http-server -g
#http-server . -p 8080 -c -1 &

for i in {1..6}
do
    xdg-open "http://localhost/?id=$i"
done