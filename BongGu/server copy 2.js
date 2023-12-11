const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const crypto = require("crypto");
const fs = require("fs");
const { ConnectionPool } = require("mssql");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.set("view engine", "ejs");

const secretKey = crypto.randomBytes(64).toString("hex");
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(checkLoginStatus);

// const config = {
//   user: "bonggu",
//   password: "1234",
//   server: "localhost",
//   database: "bonggu",
// };
const config = {
  user: "sa",
  password: "1234",
  server: "localhost",
  database: "bonggu",
  options: {
    trustServerCertificate: true,
  },
};

const pool = new ConnectionPool(config);

pool
  .connect()
  .then((pool) => {
    console.log("Connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.log("err :", err);
  });

app.listen(8080, function () {
  console.log("Server is listening on port 8080...");
});

app.get("/", async function (req, res) {
  const user = res.locals.loggedInUser;

  try {
    const result = await pool.request().query("SELECT * FROM books");
    const rows = result.recordset;

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        row.preview_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("index.ejs", { data: rows, userName: user });
  } catch (err) {
    console.error("Error executing mssql query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/goods", function (req, res) {
  const user = res.locals.loggedInUser;

  let sql = "SELECT * FROM goods";
  conn.query(sql, function (err, rows) {
    if (err) throw err;

    rows.forEach((row) => {
      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        row.preview_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    });

    res.render("index.ejs", { data: rows, userName: user });
  });
});

app.get("/workshops", function (req, res) {
  const user = res.locals.loggedInUser;

  let sql = "SELECT * FROM workshops";
  conn.query(sql, function (err, rows) {
    if (err) throw err;

    rows.forEach((row) => {
      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        row.preview_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    });

    res.render("index.ejs", { data: rows, userName: user });
  });
});

app.get("/content/:id/:product_type", function (req, res) {
  const productId = req.params.id;
  const productType = req.params.product_type;

  let sql = `SELECT * FROM ${productType} WHERE id = ?`;
  let params = [productId];

  conn.query(sql, params, function (err, result) {
    if (err) throw err;

    if (result.length > 0) {
      const productInfo = result[0];

      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        productInfo.detailed_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      productInfo.detail_image = base64Image;

      res.render("content.ejs", {
        product: productInfo,
        userName: res.locals.loggedInUser,
      });
    } else {
      res.status(404).send("Book not found");
    }
  });
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.get("/signup", function (req, res) {
  res.render("signup.ejs");
});

app.get("/bookMarks", function (req, res) {
  const user = res.locals.loggedInUser;

  if (user) {
    let bookmarksSql = "SELECT * FROM bonggu.bookmarks WHERE user_id = ?";
    let bookmarksParams = [user.id];

    conn.query(bookmarksSql, bookmarksParams, function (err, bookmarksResults) {
      if (err) {
        console.error("Error fetching bookmarks:", err);
        res.status(500).send("Internal Server Error");
      } else {
        let bookmarkDetails = [];
        if (bookmarksResults.length === 0) {
          res.send(
            '<script>alert("장바구니에 등록된 상품이 없습니다."); window.location.href = "/";</script>',
          );
        }

        bookmarksResults.forEach((bookmark) => {
          let typeSql, typeParams;
          typeSql = `SELECT * FROM bonggu.${bookmark.type} WHERE id = ?`;
          typeParams = [bookmark.product_id];

          conn.query(typeSql, typeParams, function (err, typeResults) {
            if (err) {
              console.error(
                `Error fetching details for type ${bookmark.type}:`,
                err,
              );
            } else {
              bookmarkDetails.push({
                bookmark: bookmark,
                details: typeResults[0],
              });

              if (bookmarkDetails.length === bookmarksResults.length) {
                res.render("bookMarks.ejs", {
                  user: user.name,
                  data: bookmarkDetails,
                });
              }
            }
          });
        });
      }
    });
  } else {
    res.send(
      '<script>alert("로그인이 필요합니다."); window.location.href = "/login";</script>',
    );
  }
});

app.post("/signup_server", function (req, res) {
  let sql =
    "INSERT INTO `users` (`id`, `password`, `name`, `email`, `address`, `phone_number`, `type`) VALUES (?, ?, ?, ?, ?, ?, ?);";
  let params = [
    req.body.userid,
    req.body.password,
    req.body.username,
    req.body.email,
    req.body.address,
    req.body.phone,
    "user",
  ];
  conn.query(sql, params, function (err, result) {
    if (err) throw err;
    console.log("데이터 추가 성공");
  });
  res.redirect("/");
});

app.post("/signin_server", function (req, res) {
  const id = req.body.userid;
  const password = req.body.password;

  let sql = "SELECT * FROM users WHERE id = ? AND password = ?";
  let params = [id, password];

  conn.query(sql, params, function (err, result) {
    if (err) throw err;

    if (result.length > 0) {
      console.log("로그인 성공");
      console.log(result);
      const name = result[0].name;
      req.session.user = { id, name };
      res.redirect("/");
    } else {
      res.send(
        '<script>alert("로그인이 실패"); window.location.href = "/login";</script>',
      );
    }
  });
});

app.post("/bookmark", function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const productId = req.body.productId;
  const registrationDate = req.body.registrationDate;
  const type = req.body.type;

  let checkExistenceSql =
    "SELECT * FROM `bonggu`.`bookmarks` WHERE `user_id` = ? AND `product_id` = ? AND `type` = ?;";

  let checkExistenceParams = [userId, productId, type];

  conn.query(checkExistenceSql, checkExistenceParams, function (err, results) {
    if (err) {
      console.error("Error checking bookmark existence:", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (results.length > 0) {
        res.status(400).send("이미 장바구니에 있는 상품입니다.");
      } else {
        let insertSql =
          "INSERT INTO `bonggu`.`bookmarks` (`user_id`, `product_id`, `registration_date`, `type`) VALUES (?, ?, ?, ?);";

        let insertParams = [userId, productId, registrationDate, type];

        conn.query(insertSql, insertParams, function (err, result) {
          if (err) {
            console.error("Error inserting bookmark:", err);
            res.status(500).send("Internal Server Error");
          } else {
            res.status(200).send("Book marked successfully");
          }
        });
      }
    }
  });
});

const updatePurchaseHistory = async (userId, productId, type) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const purchaseDate = `${year}-${month}-${day}`;

  const insertHistorySql =
    "INSERT INTO `bonggu`.`purchase_history` (`user_id`, `product_id`, `purchase_date`, `type`) VALUES (?, ?, ?, ?);";

  const insertHistoryParams = [userId, productId, purchaseDate, type];

  await new Promise((resolve, reject) => {
    conn.query(insertHistorySql, insertHistoryParams, function (err) {
      if (err) {
        console.error("Error inserting into purchase_history:", err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const updateQuantity = async (item) => {
  // Update quantity
  const updateQuantitySql = `UPDATE bonggu.${item.type} SET remaining_quantity = remaining_quantity - 1 WHERE id = ?;`;

  await new Promise((resolve, reject) => {
    conn.query(updateQuantitySql, [item.id], function (err) {
      if (err) {
        console.error(`Error updating ${item.type} quantity:`, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

app.post("/purchase", async function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const selectedItems = req.body.selectedItems;

  try {
    for (const item of selectedItems) {
      console.log("Selected item ID:", item.id);
      console.log("Selected item type:", item.type);

      // Check remaining quantity before processing the purchase
      const checkQuantitySql = `SELECT remaining_quantity FROM bonggu.${item.type} WHERE id = ?;`;
      const checkQuantityResult = await new Promise((resolve, reject) => {
        conn.query(checkQuantitySql, [item.id], function (err, result) {
          if (err) {
            console.error(`Error checking ${item.type} quantity:`, err);
            reject(err);
          } else {
            resolve(result[0] ? result[0].remaining_quantity : null);
          }
        });
      });

      if (checkQuantityResult <= 0) {
        // Send a JSON response with a specific structure for alert handling on the client side
        return res.status(400).json({
          success: false,
          alertMessage: "상품의 남은 수량이 없습니다.",
        });
      }

      // Update purchase history
      await updatePurchaseHistory(userId, item.id, item.type);

      // Delete bookmark
      const deleteBookmarkSql = "DELETE FROM bonggu.bookmarks WHERE id = ?;";
      await new Promise((resolve, reject) => {
        conn.query(deleteBookmarkSql, [item.id], function (err) {
          if (err) {
            console.error("Error deleting bookmark:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Update quantity after processing each selected item
      await updateQuantity(item);
    }

    // Send the success response after processing all selected items
    res.json({ success: true, message: "구매가 완료되었습니다." });
  } catch (error) {
    console.error("Error processing selected items:", error);
    res.status(500).json({ error: "Error processing selected items" });
  }
});

app.post("/search", function (req, res) {
  const searchTerm = req.body.searchTerm;
  console.log(searchTerm);
  const searchQuery = "SELECT * FROM bonggu.books WHERE title LIKE ?";

  const searchResults = [];

  conn.query(searchQuery, [`%${searchTerm}%`], function (err, results) {
    if (err) {
      console.error("Error executing search query:", err);
      return res.status(500).send("Internal Server Error");
    }

    // Process the search results
    results.forEach((result) => {
      searchResults.push({
        id: result.id,
        preview_image: result.preview_image, // Assuming this column stores base64-encoded images
        title: result.title,
        price: result.price,
        product_type: result.product_type,
      });
    });

    // Render the searchResults.ejs template with the data
    res.render("search.ejs", { searchTerm, data: searchResults });
  });
});

function checkLoginStatus(req, res, next) {
  const user = req.session.user;

  if (user) {
    res.locals.loggedInUser = user;
  } else {
    res.locals.loggedInUser = null;
  }

  next();
}
