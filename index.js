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

app.post('/token', (req, res) => {
    const { id, role, permissions } = req.body;
    const secretKey = 's3cR3t!@#1234567890qwertyUIOPasdfghJKL';

    if (!id || !role || !Array.isArray(permissions)) {
        return res.status(400).send({
            status: 'error',
            message: 'id, role, and permissions are required'
        });
    }

    const expiresInSeconds = 60;
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const payload = { role, permissions, exp };
    const token = jwt.sign(payload, secretKey);

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

// Middleware to check JWT and permissions
function authorize(requiredPermissions) {
    return (req, res, next) => {
        const secretKey = 's3cR3t!@#1234567890qwertyUIOPasdfghJKL';
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).send({
                status: 'error',
                message: 'No token provided'
            });
        }
        try {
            const decoded = jwt.verify(token, secretKey);
            req.user = decoded;
            // Check if user has at least one of the required permissions
            if (!decoded.permissions || !requiredPermissions.some(p => decoded.permissions.includes(p))) {
                return res.status(403).send({
                    status: 'error',
                    message: 'Forbidden: insufficient permissions'
                });
            }
            next();
        } catch (err) {
            return res.status(401).send({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
    };
}

// --- Apply authorization middleware to routes ---

// Only ADMIN and VISITOR can read all or one product
app.get('/products', authorize(['READ']), (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.status(200).send({
        status: 'success',
        page: page,
        limit: limit,
        total: products.length,
        products: paginatedProducts
    });
});

app.get('/products/:id', authorize(['READ']), (req, res) => {
    const { id } = req.params;
    const product = products.find(p => p.id === Number(id));
    if (!product) {
        return res.status(404).send({
            status: 'error',
            message: 'Product not found'
        });
    }
    return res.status(200).send({
        status: 'success',
        product: product
    });
});

// Only ADMIN and WRITER can create products
app.post('/products', authorize(['WRITE']), (req, res) => {
    const { id, betamount, status, multiplayer } = req.body;
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

// Only ADMIN and WRITER can update products
app.put('/products/:id', authorize(['WRITE']), (req, res) => {
    const { id } = req.params;
    const { betamount, status, multiplayer } = req.body;
    const productIndex = products.findIndex(p => p.id === Number(id));
    if (productIndex === -1) {
        return res.status(404).send({
            status: 'error',
            message: 'Product not found'
        });
    }
    if (
        (betamount !== undefined && typeof betamount !== 'number') ||
        (status !== undefined && status !== 'win' && status !== 'lose') ||
        (multiplayer !== undefined && typeof multiplayer !== 'number')
    ) {
        return res.status(400).send({
            status: 'error',
            message: 'Invalid product format'
        });
    }
    if (betamount !== undefined) products[productIndex].betamount = betamount;
    if (status !== undefined) products[productIndex].status = status;
    if (multiplayer !== undefined) products[productIndex].multiplayer = multiplayer;

    saveProductsToFile(products);

    return res.status(200).send({
        status: 'success',
        message: 'Product updated',
        product: products[productIndex]
    });
});

// Only ADMIN can delete products
app.delete('/products/:id', authorize(['WRITE', 'DELETE']), (req, res) => {
    // Only ADMIN will have both WRITE and DELETE permissions
    if (req.user.role !== 'ADMIN') {
        return res.status(403).send({
            status: 'error',
            message: 'Forbidden: only ADMIN can delete'
        });
    }
    const { id } = req.params;
    const productIndex = products.findIndex(p => p.id === Number(id));
    if (productIndex === -1) {
        return res.status(404).send({
            status: 'error',
            message: 'Product not found'
        });
    }
    const deletedProduct = products.splice(productIndex, 1)[0];
    saveProductsToFile(products);

    return res.status(200).send({
        status: 'success',
        message: 'Product deleted',
        product: deletedProduct
    });
});