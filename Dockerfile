# The Hono API. Deliberately provider-agnostic — this runs the same on Fly,
# Render, Railway, Cloud Run or a VPS, which is the point of keeping the
# backend off Vercel.
FROM node:22-alpine

WORKDIR /app

# Dependencies first, so a source-only change reuses the install layer.
# tsx is a runtime dependency here: `npm start` executes the TypeScript
# directly rather than building it to JavaScript first.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Only what the server actually loads. The client lives on Vercel.
COPY tsconfig.json ./
COPY shared ./shared
COPY server ./server

# The host overrides this; it is only the default for a bare `docker run`.
ENV PORT=3001
EXPOSE 3001

# ANTHROPIC_API_KEY must come from the host's environment. Never bake it in.
CMD ["npm", "start"]
