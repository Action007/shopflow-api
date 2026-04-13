# Day 1 - Upload Module

## Big Picture

The upload module separates file handling from business logic.

```text
Frontend uploads image
    -> backend validates file
    -> backend stores file on disk
    -> backend stores upload metadata in DB
    -> backend returns upload id + public url
```

That means product creation and user profile updates do not need to know how raw files are stored.

## Why we built a separate upload domain

If we only saved files directly to disk and returned a URL, we would have a problem:

- user uploads image
- user closes tab or reloads page
- file remains on backend
- no business entity actually uses it

That creates orphaned files.

So we introduced an `Upload` entity with lifecycle tracking.

## Upload lifecycle

Each upload has a status:

- `PENDING`
- `USED`

Meaning:

- `PENDING` = uploaded, but not yet attached to product/user
- `USED` = already attached to a real entity

This is the key idea behind the whole upload flow.

## What was added

### Prisma model

We added:

- `Upload`
- `UploadStatus`

The upload table stores:

- original file name
- generated file name
- mime type
- size
- public URL
- upload owner
- lifecycle status

## Endpoints

### `POST /api/v1/uploads/images`

This endpoint:

- accepts multipart image file
- validates mime type
- validates size
- stores the file under `uploads/`
- saves metadata in DB
- returns upload info including public `url`

Allowed file types:

- jpeg
- png
- webp

Max size:

- 5 MB

### `DELETE /api/v1/uploads/:id`

This endpoint deletes a temporary upload.

Important rule:

- only `PENDING` uploads can be deleted directly

Why:

- deleting a `USED` upload would break product/user references

## Why we added `APP_BASE_URL`

The backend should return a full usable image URL.

Examples:

- local:
  - `http://localhost:3000/uploads/<file>`
- production:
  - `https://shopflow-api-1fl0.onrender.com/uploads/<file>`

That is why backend needs `APP_BASE_URL`.

This is cleaner than forcing frontend to build file URLs manually.

## Static file serving

We exposed:

```text
/uploads/<fileName>
```

So uploaded files can be previewed immediately in the frontend.

## Frontend integration idea

Recommended frontend flow:

1. user picks image
2. frontend uploads it
3. backend returns:
   - `uploadId`
   - `url`
4. frontend shows preview using `url`
5. if user submits form later -> send `uploadId`
6. if user cancels -> call delete endpoint

## Your concern: upload but user does not proceed

That concern is valid.

The good pattern is:

- upload first creates a temporary resource
- cancel removes it
- later cleanup job can remove stale pending uploads

You can also store `{ uploadId, url }` in localStorage for a better reload experience, but localStorage is UX help, not the core safety mechanism.

The core safety mechanism is:

- upload tracked in DB
- cancel endpoint
- pending/used lifecycle

## How to explain in interview

You can say:

> I separated file upload from business entity creation. Uploads are first stored as temporary resources with metadata in the database. That lets the frontend preview images immediately, supports cancel flows, and gives the backend a clean lifecycle for uploaded files before they are attached to products or profiles.
