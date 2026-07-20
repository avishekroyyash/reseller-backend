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
    // await client.connect();
    const database = client.db('reseller-a10')
    const productCollection = database.collection('productInfo')
    const wishlistCollection = database.collection('wishlist')
    const reviewCollection = database.collection('review')
    const orderCollection = database.collection('order')
    const paymentCollection = database.collection('payment')
    const userCollection = database.collection('user')
    const sessionCollection = database.collection('session')


//verify data 
const verifyToken =async(req,res,next)=>{
  const authHeader = req?.headers?.authorization
  if(!authHeader){
   return res.status(401).send({message:'unauthorized accress '})
  }
  const token = authHeader.split(' ')[1]
  // console.log(token,'TOKEN');
  if(!token){
    return res.status(401).send({message:'unauthorized accress 1'})
  }
// console.log(req.headers,'request header ');
  const query = {token : token}
  const session = await sessionCollection.findOne(query)
  //console.log(session);
  const userId=session?.userId
  const userquery = { _id:userId}
  const user = await userCollection.findOne(userquery)
  // console.log(user,'USER-DATA');
  req.user = user
next()
}
//must use after verify token 
const verifyAdmin = async(req,res,next)=>{
  if(req.user?.role !== 'admin'){
    return res.status(403).send({message:'Forbidden Access'})
  }
  next()
}
//must use after verify token 
const verifySeller = async(req,res,next)=>{
  if(req.user?.role !== 'seller'){
    return res.status(403).send({message:'Forbidden Access'})
  }
  next()
}
//must use after verify token 
const verifyBuyer = async(req,res,next)=>{
  if(req.user?.role !== 'buyer'){
    return res.status(403).send({message:'Forbidden Access'})
  }
  next()
}




// all admin api
//admin get all user 
app.get('/api/admin/users',verifyToken,verifyAdmin,async(req,res)=>{
  const result = await userCollection.find().sort({ createdAt: -1 }).toArray()
  res.send(result)
})

// admin update user 
app.patch('/api/admin/:id',async(req,res)=>{
  const ubody = req.body
  const {id}= req.params
  const filter = {_id: new ObjectId(id)}
  const updateBody={
    $set:{
      ...ubody
    },
  }
  const result = await userCollection.updateOne(filter,updateBody)
  res.send(result)
})

//admin user delete 
 app.delete('/api/admin/:id',async(req,res)=>{
    const {id} = req.params
     const filter = {_id: new ObjectId(id)}
    const result = await userCollection.deleteOne(filter)
    res.send(result)
  }) 
  
  // Get all products by admin
app.get("/api/admin/products",verifyToken,verifyAdmin, async (req, res) => {
  const result = await productCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();
  res.send(result);
});

//admin update product just status like approve or reject 
app.patch("/api/admin/products/:id", async (req, res) => {
  const { id } = req.params;
  const product = req.body;
  const updateBody = {
    ...product,
    updatedAt: new Date(), // Better than createdAt
  };
  const result = await productCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updateBody,
    }
  );
  res.send(result);
});

// Delete product by admin
app.delete("/api/admin/products/:id", async (req, res) => {
  const { id } = req.params;
  const result = await productCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// admin all order get
app.get('/api/admin/orders',verifyToken,verifyAdmin,async(req,res)=>{
  const result = await orderCollection.find().sort({createdAt:-1}).toArray()
  res.send(result)
})

//admin update order status 
app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          orderStatus: status,
          updatedAt: new Date(),
        },
      }
    );
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Failed to update order status",
    });
  }
});

// admin dispute the order 
app.patch("/api/admin/orders/:id/dispute", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote, resolved } = req.body;
    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          "dispute.adminNote": adminNote,
          "dispute.resolved": resolved,
          "dispute.status": resolved ? "resolved" : "pending",
          "dispute.resolvedAt": resolved ? new Date() : null,
          updatedAt: new Date(),
        },
      }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to resolve dispute",
    });
  }
});

// admin dashboard data all
app.get("/api/admin/dashboard",verifyToken,verifyAdmin,async (req, res) => {
  try {
    const totalUsers = await userCollection.countDocuments();
    const totalProducts = await productCollection.countDocuments();
    const totalOrders = await orderCollection.countDocuments();
    const paidOrders = await orderCollection
      .find({ paymentStatus: "paid" })
      .toArray();
    const totalRevenue = paidOrders.reduce((sum, order) => {
      return sum + Number(order.productInfo.productPrice || 0);
    }, 0);
    const recentOrders = await orderCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    const recentUsers = await userCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    res.send({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      recentUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to load dashboard.",
    });
  }
});




  //all buyer api
  // buyer profile edit 
  app.patch('/api/user/:id',async(req,res)=>{
    const id=req.params.id
    const ubody = req.body
    const filter = {_id: new ObjectId(id)}
    const updateBody={
     $set:{
      ...ubody
     },
    }
    const result = await userCollection.updateOne(filter,updateBody)
    res.send(result)
  })

  //buyer payment data get 
  app.get('/api/payment/:id',verifyToken,verifyBuyer,async(req,res)=>{
    const id=req.params.id
    const filter = {userId: id}
    const result = await paymentCollection.find(filter).sort({ createdAt: -1 }).toArray();
    res.send(result)
  })

  // buyer api wishlist post
  app.post('/api/wishlist',async(req,res)=>{
  const wbody=req.body
  const updateBody={
    ...wbody,
    createdAt:new Date()
  }
  const result = await wishlistCollection.insertOne(updateBody)
  res.send(result)
  })

  //buyer wishlist get
  app.get('/api/wishlist',async(req,res)=>{
    const result = await wishlistCollection.find().toArray()
    res.send(result)
  })

  //get wishlist by user id
   app.get('/api/wishlist/:userid',verifyToken,verifyBuyer,async(req,res)=>{
    const {userid} = req.params
    const filter = {userId:userid}
    const result = await wishlistCollection.find(filter).toArray()
    res.send(result)
  })

  // buyer wishlist delete 
  app.delete('/api/wishlist/:id',async(req,res)=>{
    const {id} = req.params
    const filter = {productId : id}
    const result = await wishlistCollection.deleteOne(filter)
    res.send(result)
  }) 

//buyer all order get using id 
app.get("/app/order/:id",verifyToken,verifyBuyer, async (req, res) => {
  const id = req.params.id;
  const filter = {
    "buyerInfo.userId": id,
  };
  const result = await orderCollection
    .find(filter)
    .sort({ createdAt: -1 }) // Newest first
    .toArray();
  res.send(result);
});

//buyer single order get using id or param
app.get("/app/order1/:id", async (req, res) => {
  const id = req.params.id;
  const filter = {
    _id:new ObjectId(id)
  };
  const result = await orderCollection.findOne(filter)
    
  res.send(result);
});

 // buyer order cancel 
 app.patch("/api/orders/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const filter = {
    _id: new ObjectId(id),
  };
  const updateDoc = {
    $set: {
      orderStatus: "cancelled",
      cancelledBy: "buyer",
      cancelledAt: new Date(),
      cancelReason: reason || "",
    },
  };
  const result = await orderCollection.updateOne(filter, updateDoc);
  res.send(result);
});

//buyer all dashboard data 
app.get("/api/buyer/dashboard/:id",verifyToken,verifyBuyer, async (req, res) => {
  const { id } = req.params;
  const totalOrders = await orderCollection.countDocuments({
    "buyerInfo.userId": id,
  });
  const cancelledOrders = await orderCollection.countDocuments({
    "buyerInfo.userId": id,
    orderStatus: "cancelled",
  });
  const processingOrders = await orderCollection.countDocuments({
    "buyerInfo.userId": id,
    orderStatus: "processing",
  });
  const recentOrders = await orderCollection
    .find({
      "buyerInfo.userId": id,
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  res.send({
    totalOrders,
    cancelledOrders,
    processingOrders,
    recentOrders,
  });
});




// all product get in user which is just approved 
app.get("/api/products", async (req, res) => {
  // Only approved products
  const query = {
    status: "approved",
  };
  // Search by title
  if (req.query.search) {
    query.title = {
      $regex: req.query.search,
      $options: "i",
    };
  }
  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }
  // Filter by condition
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
    default:
      cursor = cursor.sort({ createdAt: -1 });
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

//get produt by product id in productdetails page
   app.get('/api/products/:id',async(req,res)=>{
    const {id}=req.params
    const result = await productCollection.findOne({_id:new ObjectId(id)})
    res.send(result)
   })

// product review of buyer id and product id 
 app.post('/api/review',async(req,res)=>{
  const rbody = req.body
  const updateBody={
    ...rbody,
    createdAt:new Date()
  }
  const result = await reviewCollection.insertOne(updateBody)
  res.send(result)
 })

// product review get by product id and sort by review
app.get('/api/review/:pid',async(req,res)=>{
  const {pid} = req.params
  const filter = {productId : pid}
  const result = await reviewCollection.find(filter).sort({rating : -1}).toArray()
  res.send(result)
})

//this is for catagories page 
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await productCollection
      .aggregate([
        {
          $match: {
            status: "approved",
          },
        },
        {
          $group: {
            _id: "$category",
            totalJobs: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            totalJobs: 1,
          },
        },
        {
          $sort: {
            category: 1,
          },
        },
      ])
      .toArray();

    res.send(categories);
  } catch (error) {
    res.status(500).send({
      message: "Failed",
    });
  }
});


  


 // all seller api 
  // make seller product post 
   app.post('/api/products',async(req,res)=>{
   const pbody = req.body
   const updateProduct = {
    ...pbody,
    createdAt:new Date()
   }
   const result = await productCollection.insertOne(updateProduct)
   res.send(result)
   }) 

  // get the seller  all product by seller id
  app.get('/api/products/seller/:sellerId',verifyToken,verifySeller,async(req,res)=>{
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

// seller get all order by there id 
app.get("/api/order/:id",verifyToken,verifySeller, async (req, res) => {
  const id = req.params.id;
  const filter = {
    "sellerInfo.userId": id,
  };
  const result = await orderCollection
    .find(filter)
    .sort({ createdAt: -1 }) // Newest first
    .toArray();
  res.send(result);
});

// seller dashboard all statistic data  
app.get("/api/seller/dashboard/:sellerId",verifyToken,verifySeller, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const totalProducts = await productCollection.countDocuments({
  "sellerInfo.userId": sellerId,
});
    const orders = await orderCollection
      .find({
        "sellerInfo.userId": sellerId,
      })
      .toArray();
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      o => o.orderStatus === "pending"
    ).length;
    const acceptedOrders = orders.filter(
      o => o.orderStatus === "accepted"
    ).length;
    const processingOrders = orders.filter(
      o => o.orderStatus === "processing"
    ).length;
    const shippedOrders = orders.filter(
      o => o.orderStatus === "shipped"
    ).length;
    const deliveredOrders = orders.filter(
      o => o.orderStatus === "delivered"
    );
    const rejectedOrders = orders.filter(
      o => o.orderStatus === "rejected"
    ).length;
    const totalRevenue = deliveredOrders.reduce(
      (sum, order) =>
        sum + Number(order.productInfo.productPrice),
      0
    );
    const recentOrders = await orderCollection
      .find({
        "sellerInfo.userId": sellerId,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    res.send({
      totalProducts,
      totalOrders,
      pendingOrders,
      acceptedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders: deliveredOrders.length,
      rejectedOrders,
      totalRevenue,
      recentOrders,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Dashboard Error",
      error: error.message, // remove this in production if desired
    });
  }
});

// seller order update status 
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
  //  console.log(status,'BACKEND_STATUS');
    const order = await orderCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }
    if (
      order.orderStatus === "delivered" ||
      order.orderStatus === "rejected"
    ) {
      return res.status(400).send({
        message: "Order can no longer be updated",
      });
    }
    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          orderStatus: status,
          updatedAt: new Date(),
        },
      }
    );
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Status update failed",
    });
  }
});

// seller reject order status
app.patch("/api/orders/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }
    if (order.orderStatus !== "pending") {
      return res.status(400).send({
        message:
          "Only pending orders can be rejected.",
      });
    }
    const result = await orderCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          orderStatus: "rejected",
          rejectedAt: new Date(),
          rejectReason: reason || "",
        },
      }
    );
    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Reject failed",
    });
  }
});




  //stripe api which verify payment and then save order and payment history .
  app.post('/api/order', async (req, res) => {
  const obody = req.body
  const updateBody = {
    ...obody,
    createdAt : new Date()
  }
  const result = await orderCollection.insertOne(updateBody)
  res.send(result)
});

//payment history 
app.post('/api/payment',async(req,res)=>{
  const pbody = req.body
  const updateBody = {
    ...pbody,
    createdAt:new Date()
  }
  const result = await paymentCollection.insertOne(updateBody)
  res.send(result)
})



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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