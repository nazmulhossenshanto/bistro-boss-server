const express = require("express");
const app = express();
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
 require('dotenv').config()
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
    deprecationErrors: true
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db("bistroDB"); 
    const reviewsCollection = db.collection('reviews');
    const menuCollection = db.collection('menu')
    const cartsCollection = db.collection('carts')
    console.log('connected to mongo db');

   app.get('/menu', async(req, res)=>{
    const result = await menuCollection.find().toArray();
    res.send(result)
   })
   app.get('/review', async(req, res)=>{
    const result = await reviewsCollection.find().toArray();
    res.send(result)
   });
  //  carts collection
  // create a cart
  app.post('/carts', async(req, res)=>{
    const cartItem = req.body;
    const result = await cartsCollection.insertOne(cartItem);
    res.send(result);
  }) ;
  // get all carts
  app.get('/carts', async(req, res)=>{
    const result = await cartsCollection.find().toArray();
    res.send(result);
  });
  // delete single cart
  app.delete('/carts/:id', async(req, res)=>{
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const result = await cartsCollection.deleteOne(query);
    res.send(result)
  })

  } finally {
  }
}

run().catch(console.dir);
// basic route
app.get("/", (req, res) => {
  res.send("bistro bossssssssssss");
  
});

app.listen(port, () => {
  console.log(`your server is running on port ${port}`);
});
