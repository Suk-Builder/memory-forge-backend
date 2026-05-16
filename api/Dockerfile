FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma/
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
EXPOSE 3000
CMD ["node", "dist/index.js"]
