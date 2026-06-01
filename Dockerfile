FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app /app
EXPOSE 3000
CMD ["npm", "run", "dev"]
