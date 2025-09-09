FROM node:20-alpine AS build-stage

WORKDIR /work_hub_api

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS prod-stage

COPY --from=build-stage /work_hub_api/dist /work_hub_api/dist
COPY --from=build-stage /work_hub_api/package.json /work_hub_api/package.json

WORKDIR /work_hub_api

RUN npm install --production

CMD ["npm", "run", "start:prod"]