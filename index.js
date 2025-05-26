const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;
const userID = [];

app.use(express.json());

const products = [];

const productsFile = path.join(__dirname, 'products.json');

// Ensure products.json exists
if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, '[]', 'utf-8');
    console.log('Created products file at:', productsFile);
} else {
    console.log('Using products file at:', productsFile);
}

// Helper to write products to file
function saveProductsToFile(products) {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2), 'utf-8');
}

// Load products from file at startup (if exists)
if (fs.existsSync(productsFile)) {
    const data = fs.readFileSync(productsFile, 'utf-8');
    try {
        const loaded = JSON.parse(data);
        if (Array.isArray(loaded)) {
            products.push(...loaded);
        }
    } catch (e) {
        // ignore parse errors, start with empty array
    }
}

app.listen(
    PORT,
    () => console.log(`Server is running on http://localhost:${PORT}`)
);

app.post('/token/:id/:role', (req, res) => {
    const { id } = req.params;
    const { role } = req.params;
    let permissions;
    const secretKey = 's3cR3t!@#1234567890qwertyUIOPasdfghJKL';

    if (role == 'ADMIN') {
        permissions = ["READ", "WRITE"];
    }
    if (role == 'VISITOR') {
        permissions = ["READ"];
    }
    if (role == 'WRITER') {
        permissions = ["WRITE"];
    }
    const expiresInSeconds = 60;
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const payload = {
        role: role,
        permissions: permissions,
        exp: exp
    };

    const token = jwt.sign(payload, secretKey);

    if (!userID.includes(id)) {
        userID.push(id);
    } else {
        return res.status(400).send({
            status: 'error',
            message: 'User ID already exists'
        });
    }

    return res.status(200).send({
        status: 'success',
        message: 'Token generated successfully',
        token: token
    });
});

// Add this endpoint to verify JWT tokens
app.get('/verify', (req, res) => {
    const secretKey = 's3cR3t!@#1234567890qwertyUIOPasdfghJKL';
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(400).send({
            status: 'error',
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        return res.status(200).send({
            status: 'success',
            message: 'Token is valid',
            payload: decoded
        });
    } catch (err) {
        return res.status(401).send({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
});

app.post('/products', (req, res) => {
    const { id, betamount, status, multiplayer } = req.body;

    // Basic validation
    if (
        typeof id !== 'number' ||
        typeof betamount !== 'number' ||
        (status !== 'win' && status !== 'lose') ||
        typeof multiplayer !== 'number'
    ) {
        return res.status(400).send({
            status: 'error',
            message: 'Invalid product format'
        });
    }

    const product = { id, betamount, status, multiplayer };
    products.push(product);
    saveProductsToFile(products);

    return res.status(201).send({
        status: 'success',
        message: 'Product created',
        product: product
    });
});