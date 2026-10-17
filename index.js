require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken"); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// connect to mongodb
// 08lW2gjTDF6l6nDq
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pnssve1.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// basic route
app.get("/", (req, res) => {
  res.status(200).send({
    message: "Bistro Boss server is running",
  });
});

async function run() {
  try {
    await client.connect();
    const db = client.db("bistroDB");
    const usersCollection = db.collection("users");
    const reviewsCollection = db.collection("reviews");
    const menuCollection = db.collection("menu");
    const cartsCollection = db.collection("carts");
    const paymentsCollection = db.collection("payments");
    console.log("connected to mongo db");

    // jwt related api
  
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "7d",
      });

      res.send({ token });
    });
    // jwt verify token 
    
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Authentication token required",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET,
    (err, decoded) => {
      if (err || !decoded?.email) {
        return res.status(401).send({
          message: "Invalid or expired token",
        });
      }

      req.decoded = decoded;
      next();
    }
  );
};

// verify admin after verifyToken
const verifyAdmin = async(req, res, next)=>{
  const email = req.decoded.email;
  const query = {email: email};
  const user = await usersCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if(!isAdmin){
    return res.status(403).send({message: "Forbidden access"})
  };
  next()
}
    // check isAdmin
    app.get('/users/admin/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: "Unauthorized access"})
      };
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      let admin = false;
      if(user ){
        admin = user?.role === 'admin';
      };
      res.send({admin})
    });

    // stripe payment api 
   
app.post("/create-payment-intent", async (req, res) => {
  try {
    console.log("Payment request body:", req.body);

    const price = Number(req.body.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).send({
        message: "Invalid payment amount",
        receivedPrice: req.body.price,
      });
    }

    const amount = Math.round(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment Intent Error:", error.message);

    res.status(500).send({
      message: "Payment setup failed",
    });
  }
});


    // User related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isUserExist = await usersCollection.findOne(query);
      if (isUserExist) {
        return res.send({ message: "User already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get('/menu/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: id};
      const result = await menuCollection.findOne(filter);
      res.send(result);
    })
    app.post('/menu', async(req, res)=>{
      const  menu = req.body;
      const result = await menuCollection.insertOne(menu);
      res.send(result)
    });

    app.patch('/menu/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: id};
      const item = req.body;
      const updatedDoc = {
        $set: item
      }
      const result = await menuCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.delete('/menu/:id', async(req, res)=>{
      const id = req.params.id; 
      const query = {_id: id}; 
      const result = await menuCollection.deleteOne(query); 
      res.send(result)
    })
    app.get("/review", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    //  carts collection
    // create a cart
    app.post("/carts", verifyToken, async (req, res) => {
  try {
    const item = req.body; 
    const email = req.decoded.email;

    const cartItem = {
      ...item,
      email,
    };

    const result = await cartsCollection.insertOne(cartItem);

    res.status(201).send(result);
  } catch (error) {
    console.error("Add cart failed:", error);

    res.status(500).send({
      message: "Failed to add cart item",
    });
  }
});
    // get all carts
   app.get("/carts", verifyToken, async (req, res) => {
  try {
    const result = await cartsCollection
      .find({ email: req.decoded.email })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Fetch cart failed:", error);

    res.status(500).send({
      message: "Failed to fetch cart",
    });
  }
});
    // delete single cart
   app.delete("/carts/:id", verifyToken, async (req, res) => {
  try {
    
    const result = await cartsCollection.deleteOne({
      _id: new ObjectId(req.params.id),
      email: req.decoded.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Cart item not found",
      });
    }

    res.send(result);
  } catch (error) {
    console.error("Delete cart failed:", error);

    res.status(500).send({
      message: "Failed to delete cart item",
    });
  }
});


// Payment related api :
app.post('/payments',verifyToken,  async(req, res)=>{ 
  try {
    const payment = req.body;
    const paymentResult = await paymentsCollection.insertOne(payment);
    const query = {_id: {
      $in: payment.cartIds.map(id=> new ObjectId(id))
    }};

    const deleteResult = await cartsCollection.deleteMany(query);
    
    res.send({paymentResult, deleteResult})
  
    
  } catch (error) {
    console.log('payment error ', error);
      res.status(500).send({message : "Cannot payment"})
  }
});

app.get('/payments',verifyToken, async(req, res)=>{
  const email = req.query.email;
  const payments = await paymentsCollection.find({email: email}).toArray();
  res.send(payments)
})

// app.get('/payment-stats', async (req, res)=>{
//   const 
// })

    app.listen(port, () => {
  console.log(`your server is running on port ${port}`);
});

  } 
  finally {
  }
}

run().catch(console.dir);



