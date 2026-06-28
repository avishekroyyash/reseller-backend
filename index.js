const express = require('express');
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
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

   // get the product data 
  //  app.get('/api/products',async(req,res)=>{
  //   const result = await productCollection.find().toArray()
  //   res.send(result)
  //  })


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