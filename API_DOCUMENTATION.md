# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "language": "en",
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "en",
      "currency": "USD",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "en",
      "currency": "USD"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

#### GET /auth/me
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "en",
      "currency": "USD",
      "emailVerified": true,
      "phoneVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "businessProfile": {
        "businessName": "John's Business",
        "country": "US",
        "state": null,
        "verificationStatus": "Individual"
      }
    }
  }
}
```

### Business Profile

#### POST /business-profile
Create or update business profile.

**Request Body:**
```json
{
  "businessName": "John's Manufacturing Co.",
  "country": "IN",
  "state": "27",
  "addressLine": "123 Industrial Area",
  "city": "Mumbai",
  "pincode": "400001",
  "taxId": "27ABCDE1234F1Z5",
  "businessType": "Private Limited",
  "industry": "Manufacturing"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business profile created successfully",
  "data": {
    "profile": {
      "id": 1,
      "businessName": "John's Manufacturing Co.",
      "country": "IN",
      "state": "27",
      "addressLine": "123 Industrial Area",
      "city": "Mumbai",
      "pincode": "400001",
      "taxId": "27ABCDE1234F1Z5",
      "verificationStatus": "Pending",
      "businessType": "Private Limited",
      "industry": "Manufacturing",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /business-profile
Get current business profile.

#### GET /business-profile/states/india
Get list of Indian states with codes.

**Response:**
```json
{
  "success": true,
  "data": {
    "states": [
      {
        "code": "27",
        "name": "Maharashtra"
      },
      {
        "code": "24",
        "name": "Gujarat"
      }
    ]
  }
}
```

#### POST /business-profile/validate-gstin
Validate GSTIN format and extract state information.

**Request Body:**
```json
{
  "gstin": "27ABCDE1234F1Z5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "stateCode": "27",
    "stateName": "Maharashtra"
  }
}
```

### Products

#### GET /products
Get all products with pagination and search.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term
- `sortBy` (optional): Sort field (default: 'name')
- `sortOrder` (optional): Sort order (default: 'ASC')

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Widget A",
        "description": "High-quality widget",
        "unit": "pcs",
        "scrapValue": 5.00,
        "openingStock": 100,
        "currentStock": 85,
        "sellingPrice": 25.00,
        "targetMarginPercent": 20.0,
        "isActive": true,
        "totalIn": 100,
        "totalOut": 15,
        "totalSales": 15,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### GET /products/:id
Get detailed product information with cost breakdown.

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Widget A",
      "description": "High-quality widget",
      "unit": "pcs",
      "scrapValue": 5.00,
      "openingStock": 100,
      "currentStock": 85,
      "sellingPrice": 25.00,
      "targetMarginPercent": 20.0,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "materials": [
      {
        "id": 1,
        "materialName": "Steel",
        "quantity": 2.5,
        "unit": "kg",
        "unitCost": 3.00,
        "totalCost": 7.50
      }
    ],
    "jobWork": [
      {
        "id": 1,
        "description": "Machining and assembly",
        "cost": 5.00
      }
    ],
    "additionalCosts": [
      {
        "id": 1,
        "costType": "Transport",
        "description": "Delivery to warehouse",
        "cost": 1.50
      }
    ],
    "costBreakdown": {
      "materialsTotal": 7.50,
      "jobWorkTotal": 5.00,
      "additionalCostsTotal": 1.50,
      "totalProductCost": 14.00,
      "netCost": 9.00
    }
  }
}
```

#### POST /products
Create a new product.

**Request Body:**
```json
{
  "name": "Widget A",
  "description": "High-quality widget",
  "unit": "pcs",
  "scrapValue": 5.00,
  "openingStock": 100,
  "sellingPrice": 25.00,
  "targetMarginPercent": 20.0
}
```

#### PUT /products/:id
Update an existing product.

#### DELETE /products/:id
Delete a product.

#### POST /products/:id/materials
Add material to a product.

**Request Body:**
```json
{
  "materialName": "Steel",
  "quantity": 2.5,
  "unit": "kg",
  "unitCost": 3.00
}
```

#### POST /products/:id/job-work
Add job work to a product.

**Request Body:**
```json
{
  "description": "Machining and assembly",
  "cost": 5.00
}
```

#### POST /products/:id/additional-costs
Add additional cost to a product.

**Request Body:**
```json
{
  "costType": "Transport",
  "description": "Delivery to warehouse",
  "cost": 1.50
}
```

### Overheads

#### GET /overheads
Get all overheads with filtering.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `category` (optional): Filter by category
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

#### POST /overheads
Create a new overhead expense.

**Request Body:**
```json
{
  "category": "Fixed",
  "subcategory": "Rent",
  "description": "Office rent",
  "amount": 2000.00,
  "expenseDate": "2024-01-01",
  "isRecurring": true,
  "recurringFrequency": "Monthly"
}
```

#### GET /overheads/analytics
Get overhead analytics and trends.

### Stock & Sales

#### GET /stock/movements/:productId
Get stock movements for a product.

#### POST /stock/movements
Record a stock movement.

**Request Body:**
```json
{
  "productId": 1,
  "movementType": "IN",
  "quantity": 50,
  "reference": "Purchase Order #123",
  "notes": "Received from supplier"
}
```

#### GET /stock/sales/:productId
Get sales history for a product.

#### POST /stock/sales
Record a sale.

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 10,
  "unitPrice": 25.00,
  "saleDate": "2024-01-01",
  "customerName": "ABC Corp",
  "invoiceNumber": "INV-001",
  "notes": "Regular customer"
}
```

#### GET /stock/alerts/low-stock
Get low stock alerts.

#### GET /stock/summary
Get stock summary statistics.

### Reports

#### GET /reports/product-cost/:productId
Generate product cost report.

**Query Parameters:**
- `format` (optional): Report format ('json', 'pdf', 'excel')

#### GET /reports/overheads
Generate overhead report.

#### GET /reports/profitability
Generate profitability analysis report.

### Dashboard

#### GET /dashboard/kpis
Get dashboard KPIs and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalProducts": 10,
      "totalMaterialCost": 1500.00,
      "totalJobWorkCost": 800.00,
      "totalAdditionalCost": 300.00,
      "totalProductCost": 2600.00,
      "totalOverheads": 5000.00,
      "totalSales": 8000.00,
      "profitMargin": 5.0,
      "totalTransactions": 25,
      "totalQuantitySold": 150
    },
    "recentActivities": [
      {
        "type": "product",
        "description": "Widget A",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "lowStockAlerts": [
      {
        "id": 1,
        "name": "Widget A",
        "currentStock": 5,
        "unit": "pcs"
      }
    ]
  }
}
```

#### GET /dashboard/trends
Get trend data for charts.

#### GET /dashboard/quick-stats
Get quick statistics for dashboard cards.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate limited to 100 requests per 15-minute window per IP address.

## Pagination

List endpoints support pagination with the following parameters:
- `page`: Page number (1-based)
- `limit`: Items per page (default: 10)

Response includes pagination metadata:
```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```
