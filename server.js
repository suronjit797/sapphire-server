const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileupload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const fs = require('fs');

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
// const inventoryCollection = client.db("inventory").collection("products");
// const blogCollection = client.db("inventory").collection("blog");

async function run() {
    try{

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