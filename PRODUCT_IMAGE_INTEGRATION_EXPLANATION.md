# Day 2 - Product Image Integration

## Big Picture

Now product creation/update uses uploads in a controlled way.

The new flow is:

```text
Admin uploads image
    -> backend returns uploadId + url
    -> admin submits product form with imageUploadId
    -> backend consumes pending upload
    -> backend stores upload.url into product.imageUrl
    -> upload status changes to USED
```

This replaces the weaker approach where the client sends an arbitrary `imageUrl` string.

## Why `imageUploadId` is better than `imageUrl`

Before:

- client could send any `imageUrl`
- backend could not verify that image really belongs to this system
- backend had no lifecycle control

After:

- client sends `imageUploadId`
- backend verifies upload exists
- backend verifies upload is still pending
- backend marks upload as used
- backend stores the trusted upload URL

So the API becomes more consistent and safer.

## What changed in DTOs

Product DTOs now accept:

- `imageUploadId?: string`

instead of raw `imageUrl`.

That means the product API now says:

> “Attach an uploaded image resource”

instead of:

> “Trust whatever URL the client sends”

That is a better backend contract.

## What changed in ProductService

### Product create

During create:

1. validate category exists
2. if `imageUploadId` exists:
   - consume pending upload
3. create product
4. set `product.imageUrl = upload.url`

### Product update

During update:

1. validate product exists
2. if `imageUploadId` exists:
   - consume pending upload
3. update product
4. replace `imageUrl`

## Why we used transactions

Create/update product image is not one independent action.

Two things must stay consistent:

1. upload status changes to `USED`
2. product stores the upload URL

If only one of those succeeds, data becomes inconsistent.

That is why we wrapped this flow in a transaction.

This is an important backend design principle:

> if multiple related writes must succeed together, use a transaction

## Why `UploadService` owns upload consumption

`ProductService` should not contain all upload lifecycle rules.

Instead:

- `ProductService` owns product rules
- `UploadService` owns upload rules

So product service delegates:

```text
consumePendingUpload(...)
```

This is a clean service boundary.

That makes the code easier to:

- reuse later for user profile image
- test
- explain in interviews

## Frontend flow

Recommended admin frontend flow:

1. select image
2. upload it to `POST /uploads/images`
3. get `{ id, url }`
4. show preview from `url`
5. submit product form with:

```json
{
  "name": "iPhone 15",
  "price": "999.99",
  "stockQuantity": 10,
  "categoryId": "uuid",
  "imageUploadId": "upload-uuid"
}
```

The backend then converts that into final `product.imageUrl`.

## Why product still stores `imageUrl`

Even though uploads are tracked separately, product still needs an easy-to-read final field.

Why:

- product list page should simply render `product.imageUrl`
- frontend should not need to resolve upload metadata every time

So:

- `Upload` = upload lifecycle + metadata
- `Product.imageUrl` = final renderable image field

This is practical and common in real systems.

## Test coverage

We updated product tests to cover:

- create with upload
- update with new upload
- upload consumption being called
- transaction-based behavior

This matters because it proves image integration is intentional behavior, not just “it happens to work”.

## How to explain in interview

You can say:

> I changed product image handling so the client no longer sends arbitrary image URLs. Instead, the client uploads an image first and receives an upload ID. Product creation and update then consume that pending upload inside a transaction, mark it as used, and store the trusted upload URL in the product record. This keeps file lifecycle explicit and makes product reads simple for the frontend.
