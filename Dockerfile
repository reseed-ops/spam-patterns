# Spam Patterns — single supported image. Node 24 runs the TypeScript
# sources directly (type stripping); there is no build step.
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# tesseract.js packages are needed only to copy the in-browser OCR assets.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY . .
RUN node scripts/vendor-ocr.mjs \
 && rm -rf node_modules \
 && mkdir -p /data /backup && chown node:node /data /backup
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.ts"]
