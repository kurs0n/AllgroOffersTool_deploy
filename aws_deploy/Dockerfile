# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.0.0

FROM node:${NODE_VERSION}-alpine as base
WORKDIR /app
EXPOSE 3000

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci
USER node
COPY . .
CMD node /app/index.js