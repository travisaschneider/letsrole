FROM node:lts-alpine
WORKDIR /usr/app

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

RUN apk add --no-cache ffmpeg

COPY package*.json ./

COPY . .