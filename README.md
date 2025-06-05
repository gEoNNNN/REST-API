# Products API Documentation

## Overview

This API allows you to manage products with JWT-based authorization.  
You can generate tokens, verify them, and perform CRUD operations on products.

Base URL: `http://localhost:8080`

---

## Authentication

All endpoints (except `/token`) require a Bearer JWT token in the `Authorization` header.

### Generate Token

**POST** `/token`

**Request Body:**
```json
{
  "id": "string",
  "role": "string",
  "permissions": ["READ", "WRITE", "DELETE"]
}
```

**Response:**
- `200 OK` with `{ token: "..." }`
- `400 Bad Request` if missing fields

---

## Verify Token

**GET** `/verify`

**Headers:**  
`Authorization: Bearer <token>`

**Response:**
- `200 OK` if valid
- `400 Bad Request` if missing token
- `401 Unauthorized` if invalid/expired

---

## Products

### Get Products (Paginated)

**GET** `/products?page=1&limit=10`

**Headers:**  
`Authorization: Bearer <token>`

**Response:**
- `200 OK` with paginated products

---

### Get Product by ID

**GET** `/products/{id}`

**Headers:**  
`Authorization: Bearer <token>`

**Response:**
- `200 OK` with product
- `404 Not Found` if not found

---

### Create Product

**POST** `/products`

**Headers:**  
`Authorization: Bearer <token>` (needs `WRITE` permission)

**Request Body:**
```json
{
  "id": 123,
  "betamount": 100,
  "status": "win",
  "multiplayer": 1.5
}
```

**Response:**
- `201 Created` with product
- `400 Bad Request` if invalid

---

### Update Product

**PUT** `/products/{id}`

**Headers:**  
`Authorization: Bearer <token>` (needs `WRITE` permission)

**Request Body:** (any subset of fields)
```json
{
  "betamount": 200,
  "status": "lose",
  "multiplayer": 2.0
}
```

**Response:**
- `200 OK` with updated product
- `400 Bad Request` if invalid
- `404 Not Found` if not found

---

### Delete Product

**DELETE** `/products/{id}`

**Headers:**  
`Authorization: Bearer <token>` (needs `WRITE` or `DELETE` permission, and `role` must be `ADMIN`)

**Response:**
- `200 OK` with deleted product
- `403 Forbidden` if not ADMIN
- `404 Not Found` if not found

---

## Implementation

See [index.js](index.js) for the full implementation.  
- JWT authentication and permission checks are handled in the [`authorize`](index.js) middleware.
- Products are stored in-memory and persisted to [products.json](products.json).
- All endpoints log requests using the [`logRequest`](index.js) function.
- OpenAPI/Swagger docs available at `/api-docs`.
