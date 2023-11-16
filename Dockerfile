FROM node:18
WORKDIR /app
COPY package* .
RUN npm install
RUN apt-get update && apt-get install ffmpeg -y
COPY . .
RUN --mount=type=secret,id=hmt ln -s /run/secrets/hmt /app/hmt.json && make
RUN rm hmt.json

# Add Docker's official GPG key:
RUN apt-get install ca-certificates curl gnupg -y && \
 install -m 0755 -d /etc/apt/keyrings && \
 curl -fsSL https://download.docker.com/linux/debian/gpg | \
 gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
 chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
RUN echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update && apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
ENTRYPOINT [ "node", "index.js" ]