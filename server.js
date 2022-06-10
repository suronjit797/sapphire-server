const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileupload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")('sk_test_51L2xACGDwhQzJu6wXYGzxZB1GqddIUG9eW1Lq42Ijeg3ONSJLBxyatCmT7LwzxwZUG0ioeLAGvGvOfkg9JzKUAru00zvsmP1R6');

const app = express()
const port = process.env.PORT || 5000

// middle ware
app.use(cors())
app.use(express.json())
app.use(fileupload())


const jwtVerify = async (req, res, next) => {
    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeaders.split(' ')[1]
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bupbu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const productsCollection = client.db("sapphire").collection("products");
const emailCollection = client.db("sapphire").collection("email");
const userCollection = client.db("sapphire").collection("user");
const orderCollection = client.db("sapphire").collection("order");
const reviewCollection = client.db("sapphire").collection("review");
// const blogCollection = client.db("sapphire").collection("blog");

async function run() {
    try {
        await client.connect()
        console.log('database connected....')

        /************************************
        ************ user ******************* 
        *************************************/

        // make JsonWebTokenError
        app.post('/token', async (req, res) => {
            const { email } = req.body
            const result = await emailCollection.findOne({ email })
            const payload = {
                name: result.name,
                email,
                role: result.role
            }
            const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ token })
        })

        app.put('/make-admin', async (req, res) => {
            const { email } = req.body
            const filter = { email }
            const update = { $set: { role: 'admin' } }
            const result = await emailCollection.updateOne(filter, update, { upsert: true })
            res.send({ result })
        })


        app.get('/jwt-verify', jwtVerify, async (req, res) => {
            const decoded = req.decoded
            res.send(decoded)
        })

        // save user info in data base
        app.put('/users', async (req, res) => {
            const { email, name } = req.body
            const filter = { email }
            console.log(req.body);
            const updated = { $set: { name, email } }
            const result = await emailCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })

        //get all user
        app.get('/users', async (req, res) => {
            const result = await emailCollection.find().toArray()
            res.send(result)
        })
        //past a single user
        app.post('/user', jwtVerify, async (req, res) => {
            const { email } = req.decoded
            const data = req.body
            data.email = email
            const filter = { email }
            const updated = { $set: data }
            const result = await userCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })
        //get a single user data
        app.get('/user', jwtVerify, async (req, res) => {
            const { email } = req.decoded
            const result = await userCollection.findOne({ email })
            res.send(result)
        })

        // remove a user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const result = await emailCollection.deleteOne({ _id: ObjectId(id) })
            res.send(result)
        })


        /************************************
        ************ products *************** 
        *************************************/


        // get all products
        app.get('/products', async (req, res) => {
            const limit = req.query.limit || 100
            const skip = req.query.skip || 0
            const result = await productsCollection.find().limit(parseInt(limit)).skip(parseInt(skip)).toArray()
            res.send(result)
        })
        // get all products
        app.get('/recent-products', async (req, res) => {
            const limit = req.query.limit || 100
            const skip = req.query.skip || 0
            const result = await productsCollection.find().sort({ _id: -1 }).limit(parseInt(limit)).skip(parseInt(skip)).toArray()
            res.send(result)
        })

        // get single products
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const result = await productsCollection.findOne({ _id: ObjectId(id) })
            res.send(result)
        })

        // post a product
        app.post('/product', async (req, res) => {
            const { name, price, quantity, date, email, image, limit, description } = req.body
            const addProduct = {
                name,
                price: parseInt(price),
                quantity: parseInt(quantity),
                date,
                email,
                image,
                rating: 0,
                totalRating: 0,
                limit,
                description,
                review: []
            }
            const result = await productsCollection.insertOne(addProduct)
            res.send(result)
        })

        // remove a product 
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id
            const result = await productsCollection.deleteOne({ _id: ObjectId(id) })
            res.send(result)
        })

        // update a order quantity
        app.put('/product/:id', async (req, res) => {
            const { id } = req.params
            const { quantity } = req.body
            const filter = { _id: ObjectId(id) }
            const updated = { $set: { quantity: parseInt(quantity) } }
            const result = await productsCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })
        // update a product review
        app.put('/product-review/:id', async (req, res) => {
            const { id } = req.params
            const review = req.body
            const filter = { _id: ObjectId(id) }
            const updated = { $push: { review: review } }
            const result = await productsCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })




        /************************************
        ************ order *************** 
        *************************************/


        // get all order
        app.get('/orders', async (req, res) => {
            const result = await orderCollection.find().toArray()
            res.send(result)
        })
        // get single order
        app.get('/order/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const result = await orderCollection.findOne(filter)
            res.send(result)
        })

        // get user all order
        app.get('/user-order', jwtVerify, async (req, res) => {
            const email = req.decoded.email
            const filter = { email }
            const result = await orderCollection.find(filter).toArray()
            res.send(result)
        })

        // post a orders
        app.post('/order/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const { userName, email, phone, address, orderQuantity, orderPrice, productId } = req.body.newOrder
            // find product
            const product = await productsCollection.findOne(filter)
            const updatedQuantity = product.quantity - orderQuantity
            const updated = { $set: { quantity: updatedQuantity } }
            const productUpdate = await productsCollection.updateOne(filter, updated, { upsert: true })
            const orderAdd = await orderCollection.insertOne({
                userName,
                email,
                phone,
                address,
                orderQuantity,
                orderPrice,
                delivered: false,
                productName: product.name,
                paid: false,
                productId
            })
            res.send({ productUpdate, orderAdd })
        })

        // update a order 
        app.put('/order/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const updated = { $set: { delivered: true } }
            const result = await orderCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })
        // update a order -payment
        app.put('/order-pay/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const updated = { $set: { paid: true } }
            const result = await orderCollection.updateOne(filter, updated, { upsert: true })
            res.send(result)
        })

        // remove a order 
        app.delete('/order/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const product = await orderCollection.findOne(filter)
            const result = await orderCollection.deleteOne(filter)
            res.send({result, product})
        })



        // payment
        app.post('/payment-intent', async (req, res) => {
            const { price } = req.body
            if (price > 999999) {
                return res.status(501).send({ message: 'Amount must be no more than $999,999.99' })
            }
            const amount = parseFloat(price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: parseInt(amount),
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        /************************************
        ************ review *************** 
        *************************************/

        // get all review
        app.get('/review', async (req, res) => {
            const limit = parseInt(req.query.limit) || 10
            const result = await reviewCollection.find().sort({ _id: -1 }).limit(limit).toArray()
            res.send(result)
        })

        // post a review
        app.post('/review', async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        // remove a review
        app.get('/review/:id', async (req, res) => {
            const id = req.params.id
            const result = await reviewCollection.deleteOne({ _id: ObjectId(id) })
            res.send(result)
        })

        // get a review
        app.get('/review/:id', async (req, res) => {
            const id = req.params.id
            const result = await reviewCollection.find({ _id: ObjectId(id) })
            res.send(result)
        })




    }
    finally {

    }
}

run().catch(console.dir)



// base api
app.get('/', (req, res) => {
    res.json({ message: 'Assignment 12 server side' })
})

// listening...
app.listen(port, () => {
    console.log(`Server is online on port ${port} ...`);
})