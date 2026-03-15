# Project Overview

## What This App Does

A **multi-tenant parameter management system** for the run2biz Edge platform. Each tenant (identified by a "Cluster Space") can define, organize, and manage hierarchical configuration parameters in a tree structure (groups containing parameters, with arbitrary nesting).

## Domain Context

- **run2biz Edge** is a SaaS platform that runs "edge functions" — isolated microservices deployed to edge infrastructure
- This app is one such edge function, managing key-value configuration parameters per tenant
- The app name in the edge manifest is `parameters-api`, base path `/parameters-api`

## Platform

- **Runtime:** Bun
- **Package manager:** Bun (single package, no workspaces)
- **Deployment:** Edge Runtime via `manifest.yaml`
- **Database:** PostgreSQL (shared schema `parameters`, row-level tenant isolation)
- **Local dev DB alternative:** PGlite (embedded PostgreSQL, via `PGLITE_PATH` env var)
