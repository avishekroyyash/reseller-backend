const express = require('express');
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URL

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//make database and collections 



async function run() {
  try {
    await client.connect();
    const database = client.db('reseller-a10')
    const productCollection = database.collection('productInfo')
    


   // make seller job post 
   app.post('/api/products',async(req,res)=>{
   const pbody = req.body
   const updateProduct = {
    ...pbody,
    createdAt:new Date()
   }
   const result = await productCollection.insertOne(updateProduct)
   res.send(result)
   }) 



   // all seller api 
  // get the all product data and implement search/filter/sort/catagory
  //  app.get('/api/products',async(req,res)=>{
  //   const result = await productCollection.find().toArray()
  //   res.send(result)
  //  })
   
app.get("/api/products", async (req, res) => {
  const query = {};

  if (req.query.search) {
    query.title = {
      $regex: req.query.search,
      $options: "i",
    };
  }

  if (req.query.category) {
    query.category = req.query.category;
  }

  if (req.query.condition) {
    query.condition = req.query.condition;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;

  const skip = (page - 1) * limit;

  let cursor = productCollection.find(query);

  // Sorting
  switch (req.query.sort) {
    case "low":
      cursor = cursor.sort({ price: 1 });
      break;

    case "high":
      cursor = cursor.sort({ price: -1 });
      break;

    case "latest":
      cursor = cursor.sort({ createdAt: -1 });
      break;
  }

  const totalProducts = await productCollection.countDocuments(query);

  const products = await cursor
    .skip(skip)
    .limit(limit)
    .toArray();

  res.send({
    products,
    totalProducts,
    currentPage: page,
    totalPages: Math.ceil(totalProducts / limit),
  });
});




   
  // get the seller my all product
  app.get('/api/products/seller/:sellerId',async(req,res)=>{
    const {sellerId}=req.params
    const result = await productCollection.find({sellerId}).toArray()
    res.send(result)
  })
  //edit the seller product by product id
  app.patch('/api/products/:id',async(req,res)=>{
    const {id}= req.params
    const pbody = req.body
    const filter = {_id:new ObjectId(id)}
    const updateBody = {
      $set:{
        ...pbody
      },
    }
    const result = await productCollection.updateOne(filter,updateBody)
    res.send(result)
  })
  // delete the seller job
  app.delete('/api/products/:id',async(req,res)=>{
    const {id}=req.params
    const filter = {_id:new ObjectId(id)}
    const result = await productCollection.deleteOne(filter)
    res.send(result)
  })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})