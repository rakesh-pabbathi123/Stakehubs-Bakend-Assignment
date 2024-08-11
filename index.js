const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(process.env.PORT || 3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//1. Create Order API
app.post("/create-order", async (req, res) => {
  try {
    const { buyer_qty, buyer_price, seller_qty, seller_price } = req.body;

    // Validate input
    if (buyer_qty <= 0 && seller_qty <= 0) {
      return res
        .status(400)
        .json({ error: "Either buyer_qty or seller_qty is required." });
    }
    if (buyer_price <= 0 && seller_price <= 0) {
      return res
        .status(400)
        .json({ error: "Either buyer_price or seller_price is required." });
    }

    // Insert order into the PendingOrderTable
    const insertOrderQuery = `
      INSERT INTO PendingOrderTable (buyer_qty, buyer_price, seller_qty, seller_price)
      VALUES (?, ?, ?, ?);
    `;
    await db.run(insertOrderQuery, [
      buyer_qty,
      buyer_price,
      seller_qty,
      seller_price,
    ]);

    // Trigger matching logic
    await matchOrders();

    res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  2.Match Orders API
const matchOrders = async () => {
  const transaction = async (callback) => {
    await db.run("BEGIN TRANSACTION");
    try {
      await callback();
      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  };

  try {
    await transaction(async () => {
      // Fetch all pending orders
      const pendingOrdersQuery = `SELECT * FROM PendingOrderTable WHERE buyer_qty > 0 OR seller_qty > 0 ORDER BY id`;
      const pendingOrders = await db.all(pendingOrdersQuery);

      // Separate buyers and sellers
      const buyers = pendingOrders.filter((order) => order.buyer_qty > 0);
      const sellers = pendingOrders.filter((order) => order.seller_qty > 0);

      for (const buyer of buyers) {
        for (const seller of sellers) {
          if (buyer.buyer_price >= seller.seller_price) {
            // Calculate the match quantity
            const matchQty = Math.min(buyer.buyer_qty, seller.seller_qty);

            if (matchQty > 0) {
              // Insert matched orders into CompletedOrderTable
              const insertCompletedOrderQuery = `
                INSERT INTO CompletedOrderTable (price, qty)
                VALUES (?, ?)
              `;
              await db.run(insertCompletedOrderQuery, [
                seller.seller_price,
                matchQty,
              ]);

              // Update remaining quantities in PendingOrderTable
              const updateBuyerQuery = `
                UPDATE PendingOrderTable
                SET buyer_qty = buyer_qty - ?
                WHERE id = ?
              `;
              await db.run(updateBuyerQuery, [matchQty, buyer.id]);

              const updateSellerQuery = `
                UPDATE PendingOrderTable
                SET seller_qty = seller_qty - ?
                WHERE id = ?
              `;
              await db.run(updateSellerQuery, [matchQty, seller.id]);

              // Remove orders with zero quantity
              const deleteZeroQtyQuery = `
                DELETE FROM PendingOrderTable
                WHERE buyer_qty <= 0 AND seller_qty <= 0
              `;
              await db.run(deleteZeroQtyQuery);

              // Break the inner loop if the buyer's quantity is exhausted
              if (buyer.buyer_qty <= 0) break;
            }
          }
        }
      }
    });

    // Fetch updated pending orders and completed orders for the response
    const updatedPendingOrdersQuery = `SELECT * FROM PendingOrderTable`;
    const updatedPendingOrders = await db.all(updatedPendingOrdersQuery);

    const completedOrdersQuery = `SELECT * FROM CompletedOrderTable`;
    const completedOrders = await db.all(completedOrdersQuery);

    return {
      status: 200,
      pendingOrders: updatedPendingOrders,
      completedOrders: completedOrders.map((order) => ({
        id: order.id,
        price: order.price,
        qty: order.qty,
      })),
    };
  } catch (error) {
    return { status: 500, error: error.message };
  }
};

app.post("/match-orders", async (req, res) => {
  const result = await matchOrders();
  res.status(result.status).json(result);
});

// 3. Get Orders API
app.get("/get-orders", async (req, res) => {
  try {
    const pendingOrdersQuery = `SELECT * FROM PendingOrderTable`;
    const completedOrdersQuery = `SELECT * FROM CompletedOrderTable`;

    const pendingOrders = await db.all(pendingOrdersQuery);
    const completedOrders = await db.all(completedOrdersQuery);

    res.json({
      pendingOrders: pendingOrders,
      completedOrders: completedOrders.map((order) => ({
        id: order.id,
        price: order.price,
        qty: order.qty,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
