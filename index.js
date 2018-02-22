var http = require('http'),
    fs = require('fs'),
    mongodb = require('mongodb'),
    url = 'mongodb://hamza:admin@cluster0-shard-00-00-gvzkd.mongodb.net:27017,cluster0-shard-00-01-gvzkd.mongodb.net:27017,cluster0-shard-00-02-gvzkd.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
    socketIO = require('socket.io');


//create a server object:
var server = http.createServer(function (req, res) {
    var filepath = (req.url === '/') ? ('./index.html') : ('.' + req.url);
    fs.readFile(filepath, function (err, rep) {
        res.writeHead(200);
        res.end(rep, 'utf-8');
    });
}).listen(process.env.PORT || 5000); //the server object listens on port 8080

var io = socketIO.listen(server);

mongodb.MongoClient.connect(url, function (error, client) {
    if (error) {
        console.log('Error connecting to database.....');
    }
    console.log('Connection to database successful.....');
    var db = client.db('sampledb');

    io.sockets.on('connection', function (socket) {

        socket.on('message', function (data) {
            socket.emit('news', { hello: 'world' });
        });

        socket.on('another-message', function (data) {
            socket.emit('not-news', { hello: 'world' });
        });


        console.log('connection to socket made.....');
        socket.on('Login', function (data) {
            console.log('Login credentials enterred.....');
            var query = {
                Email: data.email
            };
            var arr = db.collection("users").find(query, {
                _id: 0
            }).toArray(function (err, result) {
                if (err) {
                    socket.emit('LoginReply', { answer: -1 });
                    throw err;
                }
                else {
                    var st = [];
                    for (var k in result)
                        st = result[k];

                    if (typeof st.Password === 'undefined') {
                        socket.emit('LoginReply', {
                            answer: -1
                        });
                    } else {
                        socket.emit('LoginReply', {
                            answer: 0,
                            username: st.Username
                        });
                    }

                }
            });


        })

        socket.on('checkName', function (data) {
            db.collection("users").find({ "Username": data.user }).toArray(function (err, res) {
                if (err) {
                    throw err;
                }
                socket.emit('nameResult', res);
            })
        });



        socket.on('addUser', function (data) {
            db.collection("users").insert({ FirstName: data.FirstName, LastName: data.LastName, Email: data.Email, Username: data.Username, Password: data.Password }, function () {
                console.log("User inserted succefully...");
                socket.emit("addUserResult", {})
            })
        });
        // Handle input events
        socket.on('inputmessages', function (data) {
            console.log('starting to insert message in database');
            let name = data.name;
            let recieve = data.recievedby;
            let message = data.message;

            console.log('name is ' + name);
            console.log('reciever is ' + recieve);
            console.log('message is ' + message);

            // Check for name and message
            if (message == '') {
                // Send error status
                //sendStatus('Please message');
            } else {
                // Insert message
                db.collection("conversations").update({ accountname: name, reciever: recieve }, { $push: { messages: { sender: message } } }, function (err, recs, status) {
                    if (err)
                        throw err;
                    // console.log("records:" + recs);
                    // var st = [];
                    // for (var k in recs)
                    //     st = recs[k];

                    // console.log("type of st is " + typeof st);
                    // if (recs == 0) {
                    db.collection("conversations").update({ accountname: recieve, reciever: name }, { $push: { messages: { reciever: message } } });
                    //}
                    socket.emit('refresh');
                });

            }
        });


        socket.on("getContactList", function (data) {
            console.log("Name recieved to search friends : " + data.Username);
            db.collection("friends").find({ Username: data.Username }).toArray(function (err, res) {
                var st = [];
                for (var k in res)
                    st = res[k];
                console.log(st.Friends + " type of FRIENDS : " + typeof st.Friends);
                socket.emit("getContactListResult", { Friends: st.Friends });
            });
        });

        socket.on('getMessages', function (data) {
            var searchname = data.friendname;
            console.log("search name is " + searchname);
            db.collection("conversations").find({ accountname: data.accountName, reciever: searchname }).toArray(function (err, res) {
                if (err) {
                    console.log("could not find messages");
                }
                var st = [];
                for (var k in res)
                    st = res[k];

                //console.log(st.messages+" type of messages "+typeof st.messages);
                //var arr=st.messages;
                //var f=arr[0];
                //console.log(f.other);
                if (st.messages !== undefined && searchname !== "")
                    socket.emit('getMessagesResult', { mess: st.messages });
                else {
                    db.collection("conversations").find({ accountname: searchname, reciever: data.accountName }).toArray(function (err, res) {
                        var st = [];
                        for (var k in res)
                            st = res[k];

                        if (st.messages !== undefined && searchname !== "")
                            socket.emit('getMessagesResult', { mess: st.messages, reverse: true });
                        else
                            console.log("could not find messages");
                    });
                }
            });
        });
    });
});
