# syntax=docker/dockerfile:1
# check=error=true

# Horizon in one image (ADR 0025, 0026): the React app is built first, then served by Rails together
# with the API, so the browser sees one origin and the session cookie just works (ADR 0001).
# Render builds this file from the repo root (render.yaml). Rails' own backend/Dockerfile builds
# the API alone.
#
#   docker build -t horizon .
#   docker run -p 3000:3000 -e DATABASE_URL=... -e RAILS_MASTER_KEY=... horizon

ARG RUBY_VERSION=3.4.9
ARG NODE_VERSION=24

# --- The React app, built to static files ---------------------------------------------------
FROM docker.io/library/node:$NODE_VERSION-slim AS frontend
WORKDIR /frontend
# pnpm, at the version package.json names (packageManager), without prompting.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# --- Rails: the same steps as backend/Dockerfile, from the repo root -------------------------
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base
WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 postgresql-client && \
    ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development" \
    LD_PRELOAD="/usr/local/lib/libjemalloc.so"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY backend/vendor/* ./vendor/
COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile -j 1 --gemfile

COPY backend/ ./
RUN bundle exec bootsnap precompile -j 1 app/ lib/

# The built React app. Its hashed JS and CSS go under public/assets, where Rails serves them with
# a year's caching. The shell becomes public/spa.html, which SpaController sends with no-cache;
# left as index.html, the static file server would answer "/" with it and cache it for a year.
COPY --from=frontend /frontend/dist/ ./public/
RUN mv public/index.html public/spa.html

# --- The app image ----------------------------------------------------------------------------
FROM base

# Run and own only the runtime files as a non-root user.
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash
USER 1000:1000

COPY --chown=rails:rails --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --chown=rails:rails --from=build /rails /rails

# Prepares the database (and seeds it with SEED_ON_BOOT=true), then starts the server.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

EXPOSE 3000
CMD ["./bin/rails", "server"]
