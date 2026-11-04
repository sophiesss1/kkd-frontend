FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Необязательный прямой адрес API для браузера: Vite подставляет его в бандл при сборке
ARG VITE_API_BASE_URL=
RUN npm run build

FROM nginx:1.27-alpine
# Шаблон конфигурации: nginx подставляет ${API_URL} из окружения при старте контейнера
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 nginx/05-trim-api-url.envsh /docker-entrypoint.d/05-trim-api-url.envsh
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_URL=http://mock-api:8000
EXPOSE 80
