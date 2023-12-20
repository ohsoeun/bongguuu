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

        const typeResults = await pool
          .request()
          .input("productId", cart.product_id)
          .query(typeSql);

        const productInfo = typeResults.recordset[0];
        const imagePath = path.join(
          __dirname,
          "public",
          "img_preview",
          productInfo.preview_image,
        );
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        productInfo.preview_image = base64Image;

        cartDetails.push({
          cart: cart,
          details: productInfo,
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

app.get("/mypage", async function (req, res) {
  const userId = req.session.user.id;

  try {
    const query = `
      SELECT u.id, u.name, u.email, u.phone_number, u.address, ph.purchase_date, ph.product_id, ph.type,
             COALESCE(b.title, g.title, w.title) AS product_title,
             COALESCE(b.price, g.price, w.price) AS price
      FROM users u
      LEFT JOIN purchase_history ph ON u.id = ph.user_id
      LEFT JOIN books b ON ph.product_id = b.id AND ph.type = 'books'
      LEFT JOIN goods g ON ph.product_id = g.id AND ph.type = 'goods'
      LEFT JOIN workshops w ON ph.product_id = w.id AND ph.type = 'workshops'
      WHERE u.id = @userId
    `;

    const result = await pool.request().input("userId", userId).query(query);

    console.log(result.recordset[0]);
    const user = {
      id: result.recordset[0].id,
      name: result.recordset[0].name,
      email: result.recordset[0].email,
      phone_number: result.recordset[0].phone_number,
      address: result.recordset[0].address,
      purchase_history: result.recordset.map((row) => ({
        purchase_date: row.purchase_date,
        product_id: row.product_id,
        type: row.type,
        product_title: row.product_title,
        price: row.price,
      })),
    };
    res.render("mypage.ejs", { user });
  } catch (error) {
    console.error(
      "Error fetching user information and purchase history:",
      error,
    );
    res.status(500).send("Internal Server Error");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.sendStatus(200);
    }
  });
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

  // Check if the product is already in the cart
  const checkCartQuery =
    "SELECT * FROM carts WHERE user_id = @user_id AND product_id = @product_id AND type = @type";

  try {
    const checkCartResult = await pool
      .request()
      .input("user_id", user.id)
      .input("product_id", product_id)
      .input("type", product_type)
      .query(checkCartQuery);

    if (checkCartResult.recordset.length > 0) {
      // Product is already in the cart
      console.log("Product is already in the cart");
      res.status(400).send("Product already in the cart");
    } else {
      const insertCartQuery =
        "INSERT INTO carts (user_id, product_id, registration_date, quantity, type) VALUES (@user_id, @product_id, GETDATE(), @quantity, @type)";

      await pool
        .request()
        .input("user_id", user.id)
        .input("product_id", product_id)
        .input("quantity", quantity)
        .input("type", product_type)
        .query(insertCartQuery);

      console.log("장바구니 추가 성공");
      res.send('<script>alert("장바구니에 추가하였습니다.");</script>');
    }
  } catch (err) {
    console.error("Error processing cart:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/buy", async function (req, res) {
  const user = req.session.user;
  const quantity = req.body.quantity;
  const get_url = req.headers.referer;
  const product_id = get_url.split("/")[4];
  const product_type = get_url.split("/")[5];

  try {
    // Check if the product quantity is sufficient
    const checkQuantityQuery = `SELECT remaining_quantity FROM ${product_type} WHERE id = @product_id`;
    const checkQuantityResult = await pool
      .request()
      .input("product_id", product_id)
      .query(checkQuantityQuery);

    const availableQuantity =
      checkQuantityResult.recordset[0].remaining_quantity;

    if (availableQuantity < quantity) {
      // Insufficient quantity
      console.log("Insufficient quantity");
      res.status(400).send("Insufficient quantity");
      return;
    }

    // Update the quantity in the books table
    const updateQuantityQuery = `UPDATE ${product_type} SET remaining_quantity = remaining_quantity - @quantity WHERE id = @product_id`;
    await pool
      .request()
      .input("quantity", quantity)
      .input("product_id", product_id)
      .query(updateQuantityQuery);

    // Insert into purchase_history table
    const insertPurchaseQuery = `
      INSERT INTO purchase_history (user_id, product_id, purchase_date, type)
      VALUES (@user_id, @product_id, GETDATE(), @type)
    `;

    await pool
      .request()
      .input("user_id", user.id)
      .input("product_id", product_id)
      .input("type", product_type)
      .query(insertPurchaseQuery);

    console.log("Purchase successful");
    res.status(200).send("Purchase successful");
  } catch (err) {
    console.error("Error processing purchase:", err);
    res.status(500).send("Internal Server Error");
  }
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

app.post("/purchase", async function (req, res) {
  const user = req.session.user;
  const selectedItems = req.body;

  try {
    for (const item of selectedItems) {
      const [quantity, type] = item.data.split("-");

      // Update books table
      const updateQuery = `
        UPDATE ${type}
        SET remaining_quantity = remaining_quantity - @quantity
        WHERE id = @id
      `;

      await pool
        .request()
        .input("quantity", quantity)
        .input("id", item.id)
        .query(updateQuery);

      // Insert into purchase_history table
      const insertQuery = `
        INSERT INTO purchase_history (user_id, product_id, purchase_date, type)
        VALUES (@user_id, @product_id, GETDATE(), @type)
      `;

      await pool
        .request()
        .input("user_id", user.id) // Assuming user has an 'id' property
        .input("product_id", item.id)
        .input("type", type)
        .query(insertQuery);

      const deleteQuery = `
          DELETE FROM carts
          WHERE user_id = @user_id AND product_id = @product_id
        `;

      console.log("Attempting to delete from carts table...");
      console.log(
        "Delete query parameters - user_id:",
        user.id,
        "product_id:",
        item.id,
      );

      const deleteResult = await pool
        .request()
        .input("user_id", user.id)
        .input("product_id", item.id)
        .query(deleteQuery);
      console.log("Delete query result:", deleteResult);

      console.log("Deletion from carts table successful.");
    }

    res.status(200).send("Purchase request received successfully.");
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
      const imagePath = path.join(
        __dirname,
        "public",
        "img_preview",
        result.preview_image,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      result.preview_image = base64Image;

      searchResults.push({
        id: result.id,
        preview_image: result.preview_image,
        title: result.title,
        price: result.price,
        product_type: result.product_type,
      });
    });

    console.log(searchResults);
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
