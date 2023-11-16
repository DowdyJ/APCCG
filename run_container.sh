docker stop apccg &>/dev/null
docker rm apccg &>/dev/null
docker run --name=apccg \
--restart=unless-stopped -it \
-v ./hmt.json:/app/hmt.json \
-v /var/run/docker.sock:/var/run/docker.sock \
-v ./data/:/app/data/ \
-v ./settings.json:/app/settings.json \
apccg