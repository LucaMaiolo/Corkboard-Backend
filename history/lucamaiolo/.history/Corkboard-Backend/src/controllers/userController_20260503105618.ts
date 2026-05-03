const express = require("express");
const router = express.Router();
const routeRoot = "/users";
const validator = require('validator');
const bcrypt = require('bcrypt');
const saltRounds = 10;


const users = []

users['admin']='abcd1234' //admin account with password abcd1234
users['aadi']='password123' //aadi account with password password123
users['luca']='pass1234' //luca account with password pass1234
users['james']='1234abcd' //james account with password 1234abcd

function checkCredentials(username:string, password:string):boolean {
    if (users[username] && users[username] === password) {
        return true;
    }
    return false;
}

async function registerUser(request:any, response:any): Promise<void> {
    const username: string = request.body.username;
    const password: string = request.body.password;

    if (!validator.isAlphanumeric(username)) {
        response.status(400).send("Username must be alphanumeric.");
        return;
    }

    if (users[username]) {
        response.status(400).send("Username already exists.");
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        users[username] = hashedPassword;
        response.status(201).send("User registered successfully.");
    } catch (error) {
        console.error("Error hashing password:", error);
        response.status(500).send("Internal server error.");
    }
}

export { router, routeRoot, registerUser, checkCredentials };
