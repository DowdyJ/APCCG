FROM node:22
WORKDIR /app
COPY package*.json .npmrc .
RUN npm install -g npm@11
RUN npm install
RUN apt-get update && apt-get install ffmpeg -y
RUN apt-get install fortune-mod fortunes curl -y
ENV PATH="${PATH}:/usr/games"

# fortunes-off (English offensive fortunes) was dropped from Debian after bullseye, so it's
# fetched from Debian's permanent snapshot archive and installed directly instead of via apt.
RUN curl -fsSL -o /tmp/fortunes-off.deb \
    "https://snapshot.debian.org/archive/debian/20201227T203258Z/pool/main/f/fortune-mod/fortunes-off_1.99.1-7.1_all.deb" && \
    echo "5c97684c8c2e33f5a6ba8629901fc4a7e72676f7443ddb399a0d048a5343f065  /tmp/fortunes-off.deb" | sha256sum -c - && \
    dpkg -i /tmp/fortunes-off.deb && \
    rm /tmp/fortunes-off.deb
COPY . .
RUN --mount=type=secret,id=hmt ln -s /run/secrets/hmt /app/hmt.json
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