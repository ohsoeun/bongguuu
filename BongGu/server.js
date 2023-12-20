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
  try {
    const result = await pool.request().query("SELECT * FROM books");
    const rows = result.recordset;
    console.log(req.session.user);

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("index.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing mssql query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/goods", async function (req, res) {
  let sql = "SELECT * FROM goods";
  try {
    const result = await pool.request().query(sql);
    const rows = result.recordset;
    console.log(req.session.user);

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("index.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing mssql query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/workshop", async function (req, res) {
  let sql = "SELECT * FROM workshops";
  try {
    const result = await pool.request().query(sql);
    const rows = result.recordset;
    console.log(req.session.user);

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("workshop.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing mssql query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/content/:id/:product_type", async function (req, res) {
  const productId = req.params.id;
  const productType = req.params.product_type;

  let sql = `SELECT ${productType}.*, main_images.*
  FROM ${productType}
  JOIN main_images ON ${productType}.id = main_images.product_id
  WHERE ${productType}.id = @productId;
  `;
  let sql1 = `SELECT * FROM ${productType} WHERE id = @productId`;
  let img_sql = "SELECT * FROM product_images WHERE product_id = @productId";
  try {
    const result = await pool
      .request()
      .input("productId", productId)
      .query(sql);

    console.log(result.recordset);

    const productInfo = result.recordset[0];

    if (productInfo) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_main",
        productInfo.image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      productInfo.image = base64Image;

      const imageResults = await pool
        .request()
        .input("productId", productId)
        .query(img_sql);

      const imgResults = imageResults.recordset;
      let images = [];
      for (let i = 0; i < imgResults.length; i++) {
        const imagePath = path.join(
          __dirname,
          "public",
          "img_detail",
          imgResults[i].image,
        );
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        images.push(base64Image);
      }

      res.render("content.ejs", {
        product: productInfo,
        images: images,
        user: req.session.user,
      });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/carts", async function (req, res) {
  const user = req.session.user;

  if (user) {
    let cartsSql = "SELECT * FROM carts WHERE user_id = @userId";
    try {
      const cartsResults = await pool
        .request()
        .input("userId", user.id)
        .query(cartsSql);

      let cartDetails = [];
      if (cartsResults.recordset.length === 0) {
        return res.send(
          '<script>alert("장바구니에 등록된 상품이 없습니다."); window.location.href = "/";</script>',
        );
      }

      for (const cart of cartsResults.recordset) {
        let typeSql = `SELECT * FROM ${cart.type} WHERE id = @productId`;
        let typeParams = [cart.product_id];

        const typeResults = await pool
          .request()
          .input("productId", cart.product_id)
          .query(typeSql);

        cartDetails.push({
          cart: cart,
          details: typeResults.recordset[0],
        });
      }

      res.render("carts.ejs", {
        data: cartDetails,
        user: req.session.user,
      });
    } catch (err) {
      console.error("Error fetching carts:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.send(
      '<script>alert("로그인이 필요합니다."); window.location.href = "/login";</script>',
    );
  }
});

app.get("/community", async function (req, res) {
  try {
    const result = await pool.request().query("SELECT * FROM community");
    const rows = result.recordset;
    console.log(req.session.user);

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("community.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing mssql query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/info", function (req, res) {
  res.render("info.ejs", { user: req.session.user });
});

app.get("/mypage", function (req, res) {
  res.render("mypage.ejs", { user: req.session.user });
});

app.post("/signup_server", async function (req, res) {
  let sql =
    "INSERT INTO users ([id], [password], [name], [email], [address], [phone_number], [type]) VALUES (@userid, @password, @username, @email, @address, @phone, 'user');";

  try {
    await pool
      .request()
      .input("userid", req.body.userid)
      .input("password", req.body.password)
      .input("username", req.body.username)
      .input("email", req.body.email)
      .input("address", req.body.address)
      .input("phone", req.body.phone)
      .query(sql);
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

  try {
    const result = await pool
      .request()
      .input("id", req.body.userid)
      .input("password", req.body.password)
      .query(sql);

    if (result.recordset.length > 0) {
      console.log("로그인 성공");
      const name = result.recordset[0].name;
      req.session.user = { id, name };
      console.log(req.session.user);
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

app.post("/cart", async function (req, res) {
  const user = req.session.user;

  const quantity = req.body.quantity;
  const get_url = req.headers.referer;
  const product_id = get_url.split("/")[4];
  const product_type = get_url.split("/")[5];
  console.log("url: " + get_url);
  console.log("product id: " + product_id);
  let sql =
    "INSERT INTO carts (user_id, product_id, registration_date, quantity, type) VALUES (@user_id, @product_id, GETDATE(), @quantity, @type)";

  try {
    await pool
      .request()
      .input("user_id", user.id)
      .input("product_id", product_id)
      .input("quantity", quantity)
      .input("type", product_type)
      .query(sql);
    console.log("장바구니 추가 성공");
    res.send('<script>alert("장바구니에 추가하였습니다.");</script>');
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/buy", async function (req, res) {
  const user = req.session.user;
  const quantity = req.body.quantity;
  const product_id = req.url.sqlit("/")[2];
});

app.get("/book/:type", async function (req, res) {
  const type = req.params.type;

  let sql = "";
  if (type == "essay") {
    sql =
      "SELECT * FROM books WHERE type = '에세이' OR type = '소설' OR type = '문학'";
  } else if (type == "design") {
    sql =
      "SELECT * FROM books WHERE type = '디자인' OR type = '문화' OR type = '예술'";
  } else if (type == "magazine") {
    sql = "SELECT * FROM books WHERE type = '매거진'";
  } else if (type == "picture") {
    sql = "SELECT * FROM boos WHERE type = '사진'";
  } else if (type == "postcardBook") {
    sql = "SELECT * FROM books WHERE type = '엽서북'";
  }

  try {
    const result = await pool.request().query(sql);
    const rows = result.recordset;

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    res.render("index.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/goods/:type", async function (req, res) {
  const type = req.params.type;

  let sql = "";
  if (type == "sticker") {
    sql =
      "SELECT * FROM goods WHERE type = '스티커' OR type = '뱃지' OR type = '포스터'";
  } else if (type == "calendar") {
    sql = "SELECT * FROM goods WHERE type = '달력'";
  } else if (type == "notePaper") {
    sql =
      "SELECT * FROM goods WHERE type = '메모지' OR type = '노트' OR type = '엽서'";
  } else if (type == "pen") {
    sql = "SELECT * FROM goods WHERE type = '펜' OR type = '티셔츠'";
  }

  try {
    const result = await pool.request().query(sql);
    const rows = result.recordset;

    for (const row of rows) {
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        row.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    }

    const user = res.locals.loggedInUser;
    res.render("index.ejs", { data: rows, user: req.session.user });
  } catch (err) {
    console.error("Error executing MSSQL query:", err);
    res.status(500).send("Internal Server Error");
  }
});

// app.get("/worshop/:type", async function (req, res) {
//   const type = req.params.type;

//   let sql = "";
//   if (type == "essay") {
//     sql =
//       "SELECT * FROM workshop WHERE type = '에세이' OR type = '소설' OR type = '문학'";
//   } else if (type == "design") {
//     sql =
//       "SELECT * FROM workshop WHERE type = '디자인' OR type = '문화' OR type = '예술'";
//   } else if (type == "magazine") {
//     sql = "SELECT * FROM workshop WHERE type = '매거진'";
//   } else if (type == "picture") {
//     sql = "SELECT * FROM workshop WHERE type = '사진'";
//   } else if (type == "postcardBook") {
//     sql = "SELECT * FROM workshop WHERE type = '엽서북'";
//   }

//   try {
//     const result = await pool.request().query(sql);
//     const rows = result.recordset;

//     for (const row of rows) {
//       const imagePath = path.join(
//         __dirname,
//         "public",
//         "img_preview",
//         row.preview_image,
//       );
//       const imageBuffer = fs.readFileSync(imagePath);
//       const base64Image = imageBuffer.toString("base64");

//       row.preview_image = base64Image;
//     }

//     res.render("index.ejs", { data: rows,  user: req.session.user });
//   } catch (err) {
//     console.error("Error executing MSSQL query:", err);
//     res.status(500).send("Internal Server Error");
//   }
// });

app.get("/login", function (req, res) {
  res.render("login.ejs", { user: req.session.user });
});

app.get("/signup", function (req, res) {
  res.render("signup.ejs", { user: req.session.user });
});

app.get("/community", function (req, res) {
  res.render("community.ejs", { user: req.session.user });
});

app.post("/carts", function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const productId = req.body.productId;
  const registrationDate = req.body.registrationDate;
  const type = req.body.type;

  let checkExistenceSql =
    "SELECT * FROM `carts` WHERE `user_id` = ? AND `product_id` = ? AND `type` = ?;";

  let checkExistenceParams = [userId, productId, type];

  conn.query(checkExistenceSql, checkExistenceParams, function (err, results) {
    if (err) {
      console.error("Error checking carts existence:", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (results.length > 0) {
        res.status(400).send("이미 장바구니에 있는 상품입니다.");
      } else {
        let insertSql =
          "INSERT INTO `carts` (`user_id`, `product_id`, `registration_date`, `type`) VALUES (?, ?, ?, ?);";

        let insertParams = [userId, productId, registrationDate, type];

        conn.query(insertSql, insertParams, function (err, result) {
          if (err) {
            console.error("Error inserting carts:", err);
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

      const checkQuantitySql = `SELECT remaining_quantity FROM ${item.type} WHERE id = @productId;`;
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

      const deletecartsSql = "DELETE FROM carts WHERE id = @productId;";
      await pool.request().input("productId", item.id).query(deletecartsSql);

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
  const searchQuery = "SELECT * FROM books WHERE title LIKE @searchTerm";

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

    res.render("search.ejs", {
      searchTerm,
      data: searchResults,
      user: req.session.user,
    });
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
    "INSERT INTO `purchase_history` (`user_id`, `product_id`, `purchase_date`, `type`) VALUES (@userId, @productId, @purchaseDate, @type);";

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
  const updateQuantitySql = `UPDATE ${item.type} SET remaining_quantity = remaining_quantity - 1 WHERE id = @productId;`;

  try {
    await pool.request().input("productId", item.id).query(updateQuantitySql);
  } catch (err) {
    console.error(`Error updating ${item.type} quantity:`, err);
    throw err;
  }
};
