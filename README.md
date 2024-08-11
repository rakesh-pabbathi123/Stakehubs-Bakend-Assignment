## **created by:Rakesh Pabbathi**

## **Stakehubs Assignment**

# Order Matching System - Backend

## Objective

Design and implement the backend of an order matching system to handle order creation, matching, and data retrieval. Ensure data integrity with transactional operations and provide a robust API for frontend integration.

## Tech Stack

- **Server**: Node.js, Express
- **Database**: SQLite
- **Testing**: https://reqbin.com/

## Functionality

### Create Order API

- **Endpoint: POST /create-order**
  - Description: Accepts buyer and seller orders, inserts them into the PendingOrderTable.
  - Request Body:
    ```json
    {
      "buyer_qty": 10,
      "buyer_price": 100.5,
      "seller_qty": 8,
      "seller_price": 105.0
    }
    ```
  - Response:
    - Success: Message indicating the order was created successfully.
    - Error: Message indicating the failure reason.

### Match Orders API

**Matching Logic**:

    - When a new order is added, the system should trigger a check in the `PendingOrderTable` to find any matching seller/buyer orders.
    - A match is found when `buyer_price` >= `seller_price`. Move the minimum quantity of the matched order to `CompletedOrderTable` and update quantities in `PendingOrderTable` as necessary.

- **Endpoint: POST /match-orders**
  - Description: Checks for matching orders in the PendingOrderTable, updates quantities, and moves matched orders to the CompletedOrderTable.
  - Request Body: None
  - Response:
    - Success: Message indicating the orders were matched and processed successfully.
    - Error: Message indicating the failure reason.

### Get Orders API

- **Endpoint**: GET /get-orders
  - Description: Fetches current orders from both PendingOrderTable and CompletedOrderTable.
  - Response:
    ```json
    {
      "pending_orders": [
        {
          "buyer_qty": 10,
          "buyer_price": 100.5,
          "seller_qty": 8,
          "seller_price": 105.0
        }
      ],
      "completed_orders": [
        {
          "price": 102.0,
          "qty": 5
        }
      ]
    }
    ```

## Database Schema

### PendingOrderTable

- id (INTEGER PRIMARY KEY)
- buyer_qty (INTEGER)
- buyer_price (REAL)
- seller_qty (INTEGER)
- seller_price (REAL)

### CompletedOrderTable

- id (INTEGER PRIMARY KEY)
- price (REAL)
- qty (INTEGER)

## Indexes

Add indexes on `buyer_price` and `seller_price` in the PendingOrderTable to speed up the matching process.

## Transaction Management

Use SQLite transactions to ensure data integrity and handle concurrent order placements.

## Resources

### Design Files

No specific design files required.

## APIs

- **Order Creation: POST /create-order - Create new orders.**
- **Order Matching: POST /match-orders - Process and match pending orders.**
- **Order Fetch: GET /get-orders - Retrieve current orders from pending and completed tables.**

## Third-Party Packages

- **Express**: For building the API server.
- **SQLite**: For database management.
- **https://reqbin.com/**: For testing.
