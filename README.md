Backend (NestJS) monorepo-style app: **orders API** (`app-service`), **payments** gRPC service (`payment-service`). CI/CD is GitHub Actions → Docker Hub → stage/production on DigitalOcean Droplets via Docker Compose.

### Git branch strategy

| Branch / pattern | Role |
|------------------|------|
| `feature/*` | Short-lived work, PR → `develop` |
| `develop` | Integration; merge to `main` when releasing |
| `main` | Production-ready history |
| `release/*`, `hotfix/*` | Optional release/hotfix flows |

**CI:** pull requests targeting `develop` or `main` run [`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml). Enable **branch protection** on `develop` / `main` and require this check to pass before merge.

**Build & stage:** pushes to `develop` / `main` run [`.github/workflows/build-and-stage.yml`](.github/workflows/build-and-stage.yml) (immutable tag `sha-<7>` + `release-manifest.json` artifact), then [`.github/workflows/deploy-stage.yml`](.github/workflows/deploy-stage.yml) deploys to GitHub Environment **`stage`**.

**Production:** [`.github/workflows/deploy-prod.yml`](.github/workflows/deploy-prod.yml) is **manual** (`workflow_dispatch`), GitHub Environment **`production`** (configure **required reviewers**). The workflow deploys an **existing** image ref (same registry tag as stage for that release — **no `docker build`** on the server).

### Workflows (summary)

| Workflow | Trigger | Role |
|----------|---------|------|
| `pr-checks.yml` | PR → `develop` / `main` | `npm ci`, lint, unit tests, HTTP smoke, **migration/schema check** (`db:check`), build, Docker build validation |
| `build-and-stage.yml` | Push `develop` / `main`, dispatch | Build/push image, immutable tag, `release-manifest.json` artifact |
| `deploy-stage.yml` | After successful Build and Stage, dispatch | Environment `stage`, DO + Compose, post-deploy smoke |
| `deploy-prod.yml` | Manual dispatch only | Environment `production`, same pull-only deploy, concurrency lock |

### Secrets / configuration

Configure **repository secrets** (Docker Hub, etc.) and **Environment** secrets for `stage` and `production` (SSH, DB, droplet hosts). Do not commit real `.env` files.

### Local deploy

- **Docker Compose (stage):** see [`deploy/compose/stage/docker-compose.yml`](deploy/compose/stage/docker-compose.yml) — create `.env` from `env.template`, then `docker compose up -d` from that directory (requires pulled image or local build).

### Multi-service note

The pipeline is **production-like** with a **single** deployable HTTP image (`app-service` / **orders-api** in `release-manifest.json`). The **payments** gRPC service is a separate Node entrypoint; a second image/workflow can be added later using the same patterns (path filters, extra jobs).

---

## Nest (upstream) description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```