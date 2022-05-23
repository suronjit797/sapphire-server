const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileupload = require('express-fileupload');
const jwt = require('jsonwebtoken');

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

        app.get('/jwt-verify', jwtVerify, async (req, res) => {
            const decoded = req.decoded
            res.send(decoded)

        })

        // save user info in data base
        app.put('/users', async (req, res) => {
            const { email, name } = req.body
            const filter = { email }
            console.log(req.body);
            const updated = { $set: { name, email, role: 'user' } }
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
        //past a single user data
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

        // get single products
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const result = await productsCollection.find({ _id: ObjectId(id) }).toArray()
            res.send(result)
        })

        // post a product
        app.post('/product', async (req, res) => {
            const { name, price, quantity, date, email, image } = req.body
            const addProduct = {
                name,
                price: parseInt(price),
                quantity: parseInt(quantity),
                date,
                email,
                image,
                rating: 0,
                totalRating: 0,
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