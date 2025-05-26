const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8080;
const userID = [];
console.log('Generated token:', token);

app.listen(
    PORT,
    () => console.log(`Server is running on http://localhost:${PORT}`)
);

app.post('/token/:id/:role', (req, res) => {
    const { id } = req.params;
    const { role } = req.params;
    let permissions; // Declare here

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