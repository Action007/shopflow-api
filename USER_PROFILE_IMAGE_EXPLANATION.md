# Day 3 - User Profile Image

## Big Picture

This step extends the upload lifecycle we already built and applies it to users.

The flow is:

```text
User uploads avatar
    -> backend returns uploadId + url
    -> frontend shows preview
    -> user saves profile with imageUploadId
    -> backend consumes pending upload
    -> backend stores upload.url into user.profileImageUrl
    -> upload status becomes USED
```

So the profile image flow follows the same architecture as product images.

## Why we used the same pattern as products

This is a deliberate design choice.

Instead of inventing a second image flow just for users, we reused the same upload lifecycle:

- upload first
- get `uploadId`
- consume upload in business module
- store final URL in entity

Why this is better:

- one mental model across the whole app
- easier to maintain
- easier to test
- much easier to explain in interviews

That consistency is a big professional win.

## Schema change

We added:

- `User.profileImageUrl`

Why:

- frontend needs a simple direct field to render avatar
- user entity should expose its final public avatar URL directly

This is the same reasoning we used for `Product.imageUrl`.

## API contract

User update now supports:

- `imageUploadId?: string`

That means profile image updates no longer accept an arbitrary raw URL from the client.

Instead, the client says:

> “Use this upload resource as my profile image.”

That makes the backend the source of truth.

## What happens in `UserService.update`

When `imageUploadId` is present:

1. check user exists
2. call `UploadService.consumePendingUpload(...)`
3. upload service validates:
   - upload exists
   - upload is still pending
   - upload belongs to current user, or updater is admin
4. backend updates:

```text
user.profileImageUrl = upload.url
```

This happens inside a transaction.

## Why transaction matters here too

Two things must stay consistent:

1. upload status changes to `USED`
2. user profile gets updated with the final URL

If only one succeeds, state becomes inconsistent.

So we keep the same transaction principle as before:

> related writes that must succeed together should be transactional

## Why ownership validation matters

This is a subtle but important security point.

If uploads are user-owned resources, then another normal user should not be able to attach someone else’s pending upload to their own profile.

That is why upload consumption checks:

- same uploader
- or admin role

This is a good example of backend authorization beyond simple route guards.

## Frontend flow

Recommended profile image flow:

1. user selects avatar file
2. frontend uploads it to `POST /uploads/images`
3. backend returns `{ id, url }`
4. frontend previews `url`
5. on profile save, frontend sends:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "imageUploadId": "upload-uuid"
}
```

6. backend consumes upload and stores `profileImageUrl`

## Why not store binary file in user table?

Because that is usually the wrong place for images.

Better pattern:

- file storage on disk/cloud
- DB stores metadata and public URL

Why:

- simpler queries
- lighter DB rows
- easier CDN/static serving later
- easier storage migration later

## Tests

We updated user service tests to cover:

- profile image attachment via `imageUploadId`
- upload consumption delegation
- final `profileImageUrl` persistence

This proves the new profile image behavior is intentional and protected by tests.

## How to explain in interview

You can say:

> I reused the same upload lifecycle for user profile images that I had already built for product images. The client uploads an image first and gets an upload ID back. Then profile update consumes that pending upload inside a transaction and stores the trusted upload URL in `profileImageUrl`. This keeps the design consistent, enforces ownership rules, and makes user reads simple for the frontend.
