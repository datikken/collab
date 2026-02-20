FROM node:20-bullseye-slim
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.1.1 --activate

COPY . /app

RUN yarn install && yarn build

CMD ["npm", "run", "start"]
