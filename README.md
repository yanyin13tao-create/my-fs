# Mintea File Service

`my-fs` is the separate file-management service for Mintea. Mintea should store
only file IDs and lightweight metadata. This service stores and transfers the
actual image bytes.

## Current Shape

This first version is intentionally small:

- Node.js built-in HTTP server.
- Local disk storage under `storage/` or a Docker volume for image bytes.
- Optional PostgreSQL/RDS metadata storage through AWS Secrets Manager.
- Raw binary upload endpoint.
- Public file delivery endpoint.
- Metadata endpoint.
- CORS support for browser uploads from the frontend.

It can later replace local storage with S3 without changing Mintea's core data
model, because Mintea should keep only the `fileId`.

## API

### Health

```sh
curl http://localhost:4000/health
```

### Upload Image

Send the image bytes as the request body:

```sh
curl -X POST http://localhost:4000/files \
  -H "Content-Type: image/png" \
  -H "X-File-Name: example.png" \
  --data-binary "@example.png"
```

Response:

```json
{
  "file": {
    "id": "uuid",
    "kind": "image",
    "mimeType": "image/png",
    "originalName": "example.png",
    "sizeBytes": 12345,
    "path": "uuid.png",
    "url": "http://localhost:4000/files/uuid",
    "createdAt": "ISO timestamp"
  }
}
```

### Read Metadata

```sh
curl http://localhost:4000/metadata/<fileId>
```

### Read File

```sh
curl http://localhost:4000/files/<fileId>
```

## Docker

```sh
docker compose up --build
```

The service publishes port `4000` and stores files in the `file-storage` Docker
volume.

## Environment

- `PORT`: service port, default `4000`.
- `PUBLIC_BASE_URL`: public URL used in returned file metadata.
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed to upload/read.
- `FILES_ROOT`: local storage directory.
- `MAX_FILE_BYTES`: upload size limit.
- `ALLOWED_IMAGE_MIME_TYPES`: comma-separated image MIME allowlist.
- `AWS_REGION`: region used for Secrets Manager.
- `DB_SECRET_ID`: optional Secrets Manager secret name or ARN for RDS metadata.
- `DB_HOST`: optional override for the RDS host.
- `DB_PORT`: PostgreSQL port.
- `DB_NAME`: database name.
- `DB_SSL`: set to `false` only for local non-SSL databases.

Do not put database passwords in code or commit `.env` files. In production, the
EC2 instance should use an IAM role with permission to read only the specific
Secrets Manager secret needed by this service.

## How Mintea Should Use It

The intended flow is:

1. Frontend uploads image bytes to `my-fs`.
2. `my-fs` stores the image and returns a file ID.
3. Frontend submits a post/comment to Mintea with `attachments: [{ fileId }]`.
4. Mintea stores only that file ID in Redis.
5. Frontend renders the image through the file service URL:
   `/files/<fileId>` or `https://files.dr.dior.com/files/<fileId>`.

For production, add:

- Upload authorization from Mintea to `my-fs`.
- Private service-to-service token validation.
- Image resizing and thumbnails.
- S3 or EBS-backed storage with backups.
- Nginx/TLS for `files.dr.dior.com`.
