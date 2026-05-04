const users = []


users['admin']='abcd1234' //admin account with password abcd1234

function checkCredentials(username:string, password:string):boolean {
    if (users[username] && users[username] === password) {
        return true;
    }
    return false;
}

