# FastIndex – Document Indexing & Search Engine

FastIndex is a schema-driven REST API for managing structured JSON documents with validation, caching, search, and secure access.  
It integrates **Redis** for key/value storage, **Elasticsearch** for parent-child indexing, and **RabbitMQ** for asynchronous workflows. Security is enforced with **Google OAuth 2.0 (RS256)** signed Bearer tokens.



## Features
- REST API for any structured JSON
- CRUD operations: `POST`, `GET`, `PATCH`, `DELETE`
- JSON Schema validation on all payloads
- Conditional reads/writes with **ETag support**
- Cascaded deletes across Redis & Elasticsearch
- PATCH updates propagate to Elasticsearch index
- Parent-child indexing in Elasticsearch
- Async consistency using RabbitMQ
- OAuth 2.0 RS256 authentication with Google IDP


## Architecture
Client → API (Node.js/Express)
- Redis (key/value store)
- Elasticsearch (search + parent-child indexing)
- RabbitMQ (async indexing workflow)


## Tech Stack
- Node.js / Express
- Redis
- Elasticsearch
- RabbitMQ
- JSON Schema (Ajv)
- Google OAuth 2.0 (RS256)


## Installation
git clone https://github.com/Harshitha-Sappidi/FastIndex-DocumentIndexing-SearchEngine-.git
cd FastIndex-DocumentIndexing-SearchEngine
npm install
docker-compose up -d   # start Redis, Elasticsearch, RabbitMQ
npm start


## Environment Variables
PORT=3000
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
RABBITMQ_URL=amqp://localhost
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

## API Usage

### Create Document
POST /plans
Authorization: Bearer <token>
Content-Type: application/json

### Get Document (with ETag)
GET /plans/:id
If-None-Match: "etag-value"
Response:
HTTP/1.1 304 Not Modified

### Update Document
PATCH /plans/:id
Authorization: Bearer <token>

### Delete Document (cascaded)
DELETE /plans/:id
Authorization: Bearer <token>

## Security
Uses Google OAuth 2.0 as Identity Provider

API validates RS256-signed Bearer tokens
