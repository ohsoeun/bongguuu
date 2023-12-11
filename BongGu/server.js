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

app.get("/goods", async function (req, res) {
  const user = res.locals.loggedInUser;

  let sql = "SELECT * FROM goods";
  try {
    const result = await pool.request().query(sql);
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
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/workshops", async function (req, res) {
  const user = res.locals.loggedInUser;

  let sql = "SELECT * FROM workshops";
  try {
    const result = await pool.request().query(sql);
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
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/content/:id/:product_type", async function (req, res) {
  const productId = req.params.id;
  const productType = req.params.product_type;

  let sql = `SELECT * FROM ${productType} WHERE id = @productId`;
  try {
    const result = await pool
      .request()
      .input("productId", productId)
      .query(sql);

    const productInfo = result.recordset[0];

    if (productInfo) {
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
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/bookMarks", async function (req, res) {
  const user = res.locals.loggedInUser;

  if (user) {
    let bookmarksSql = "SELECT * FROM bonggu.bookmarks WHERE user_id = @userId";
    try {
      const bookmarksResults = await pool
        .request()
        .input("userId", user.id)
        .query(bookmarksSql);

      let bookmarkDetails = [];
      if (bookmarksResults.recordset.length === 0) {
        return res.send(
          '<script>alert("장바구니에 등록된 상품이 없습니다."); window.location.href = "/";</script>',
        );
      }

      for (const bookmark of bookmarksResults.recordset) {
        let typeSql = `SELECT * FROM bonggu.${bookmark.type} WHERE id = @productId`;
        let typeParams = [bookmark.product_id];

        const typeResults = await pool
          .request()
          .input("productId", bookmark.product_id)
          .query(typeSql);

        bookmarkDetails.push({
          bookmark: bookmark,
          details: typeResults.recordset[0],
        });
      }

      res.render("bookMarks.ejs", {
        user: user.name,
        data: bookmarkDetails,
      });
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.send(
      '<script>alert("로그인이 필요합니다."); window.location.href = "/login";</script>',
    );
  }
});

app.post("/signup_server", async function (req, res) {
  let sql =
    "INSERT INTO `users` (`id`, `password`, `name`, `email`, `address`, `phone_number`, `type`) VALUES (@userid, @password, @username, @email, @address, @phone, 'user');";
  let params = {
    userid: req.body.userid,
    password: req.body.password,
    username: req.body.username,
    email: req.body.email,
    address: req.body.address,
    phone: req.body.phone,
  };

  try {
    await pool.request().input(params).query(sql);
    console.log("데이터 추가 성공");
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).send("Internal Server Error");
  }
  res.redirect("/");
});

app.post("/signin_server", async function (req, res) {
  const id = req.body.userid;
  const password = req.body.password;

  let sql = "SELECT * FROM users WHERE id = @id AND password = @password";
  let params = { id, password };

  try {
    const result = await pool.request().input(params).query(sql);

    if (result.recordset.length > 0) {
      console.log("로그인 성공");
      const name = result.recordset[0].name;
      req.session.user = { id, name };
      res.redirect("/");
    } else {
      res.send(
        '<script>alert("로그인이 실패"); window.location.href = "/login";</script>',
      );
    }
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/bookmark", async function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const productId = req.body.productId;
  const registrationDate = req.body.registrationDate;
  const type = req.body.type;

  let checkExistenceSql =
    "SELECT * FROM `bonggu`.`bookmarks` WHERE `user_id` = @userId AND `product_id` = @productId AND `type` = @type;";

  let checkExistenceParams = { userId, productId, type };

  try {
    const results = await pool
      .request()
      .input(checkExistenceParams)
      .query(checkExistenceSql);

    if (results.recordset.length > 0) {
      res.status(400).send("이미 장바구니에 있는 상품입니다.");
    } else {
      let insertSql =
        "INSERT INTO `bonggu`.`bookmarks` (`user_id`, `product_id`, `registration_date`, `type`) VALUES (@userId, @productId, @registrationDate, @type);";

      let insertParams = { userId, productId, registrationDate, type };

      await pool.request().input(insertParams).query(insertSql);

      res.status(200).send("Bookmarked successfully");
    }
  } catch (err) {
    console.error("Error checking bookmark existence:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.get("/signup", function (req, res) {
  res.render("signup.ejs");
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

app.post("/purchase", async function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const selectedItems = req.body.selectedItems;

  try {
    for (const item of selectedItems) {
      console.log("Selected item ID:", item.id);
      console.log("Selected item type:", item.type);

      const checkQuantitySql = `SELECT remaining_quantity FROM bonggu.${item.type} WHERE id = @productId;`;
      const checkQuantityResult = await pool
        .request()
        .input("productId", item.id)
        .query(checkQuantitySql);

      if (checkQuantityResult.recordset[0].remaining_quantity <= 0) {
        return res.status(400).json({
          success: false,
          alertMessage: "상품의 남은 수량이 없습니다.",
        });
      }

      await updatePurchaseHistory(userId, item.id, item.type);

      const deleteBookmarkSql =
        "DELETE FROM bonggu.bookmarks WHERE id = @productId;";
      await pool.request().input("productId", item.id).query(deleteBookmarkSql);

      await updateQuantity(item);
    }

    res.json({ success: true, message: "구매가 완료되었습니다." });
  } catch (error) {
    console.error("Error processing selected items:", error);
    res.status(500).json({ error: "Error processing selected items" });
  }
});

app.post("/search", async function (req, res) {
  const searchTerm = req.body.searchTerm;
  console.log(searchTerm);
  const searchQuery = "SELECT * FROM bonggu.books WHERE title LIKE @searchTerm";

  const searchResults = [];

  try {
    const results = await pool
      .request()
      .input("searchTerm", `%${searchTerm}%`)
      .query(searchQuery);

    results.recordset.forEach((result) => {
      searchResults.push({
        id: result.id,
        preview_image: result.preview_image,
        title: result.title,
        price: result.price,
        product_type: result.product_type,
      });
    });

    // Render the searchResults.ejs template with the data
    res.render("search.ejs", { searchTerm, data: searchResults });
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    return res.status(500).send("Internal Server Error");
  }
});

const updatePurchaseHistory = async (userId, productId, type) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const purchaseDate = `${year}-${month}-${day}`;

  const insertHistorySql =
    "INSERT INTO `bonggu`.`purchase_history` (`user_id`, `product_id`, `purchase_date`, `type`) VALUES (@userId, @productId, @purchaseDate, @type);";

  const insertHistoryParams = {
    userId,
    productId,
    purchaseDate,
    type,
  };

  try {
    await pool.request().input(insertHistoryParams).query(insertHistorySql);
  } catch (err) {
    console.error("Error inserting into purchase_history:", err);
    throw err;
  }
};

const updateQuantity = async (item) => {
  // Update quantity
  const updateQuantitySql = `UPDATE bonggu.${item.type} SET remaining_quantity = remaining_quantity - 1 WHERE id = @productId;`;

  try {
    await pool.request().input("productId", item.id).query(updateQuantitySql);
  } catch (err) {
    console.error(`Error updating ${item.type} quantity:`, err);
    throw err;
  }
};

function checkLoginStatus(req, res, next) {
  const user = req.session.user;

  if (user) {
    res.locals.loggedInUser = user;
  } else {
    res.locals.loggedInUser = null;
  }

  next();
}
