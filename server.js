var express = require('express');
var passport = require('passport')
var redis = require('redis');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var bodyParser = require('body-parser');
var mysql = require('mysql');
var fs = require('fs');
var util = require('util');
const bcrypt = require('bcrypt')
const LocalStrategy = require('passport-local').Strategy

var client = redis.createClient(6379, 'redis-az.alfq8r.ng.0001.use1.cache.amazonaws.com');
var app = express();

var user_count = 0;

client.on('connect', function(){
	console.log('Connected to Redis...');
})

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
})

// Establishing connection to mysql
var con = mysql.createConnection({
	host: "ediss.cv733amakhv0.us-east-1.rds.amazonaws.com",
	port: 3306,
	user: "harsh",
	password: "password",
	database: "ediss",
	multipleStatements: true
});

con.connect(function(err) {
	if (err) throw err;
	console.log("Connected to Mysql");
});

app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));

// Adding session related information
app.use(session({
		cookie: { maxAge: 900000, path: '/'},
		store: new redisStore({ host: 'redis-az.alfq8r.ng.0001.use1.cache.amazonaws.com', port: 6379, client: client,ttl :  900}),
		saveUninitialized: false,
		resave: false,
		secret: 'abc',
		rolling: true
}))

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

// Index page for manual testing
app.get('/index.html', function (req, res) {
	 res.sendFile( __dirname + "/" + "index.html" );
})

// Login
app.post('/login', function(req, res){
	var username = req.body.username;
	var password = req.body.password;

	console.log('Entering login'+JSON.stringify(req.body))
	con.query('select * from Users where username=? and password=?', [username, password], (errors, results, fields) => {
						if (errors) {
								throw errors;
						}
						if (results.length > 0) {
								req.session.loggedin = true;
								req.session.username = username;
								req.session.userId = results[0].id;
								var first_name = results[0].fname
								res.json({
										"message": "Welcome " + first_name
								})
								console.log(req.session.username + ' logged in');
						} else {
								res.json({
										"message": "There seems to be an issue with the username/password combination that you entered"
								})
						}
				});
}) //Login ends

//Logout
app.post('/logout', function(req, res){
	console.log('Entering logout'+JSON.stringify(req.body));
	console.log(req.session.username + ' logging out');
	if(req.session.loggedin){
		req.session.destroy()
			res.json({
						"message": "You have been successfully logged out"
				})
	}
	else{
		res.json({
						"message": "You are not currently logged in"
				})
	}

}) //Logout ends


//RegisterUser
app.post('/registerUser', function(req,res){
	console.log('Enetring registerUser'+JSON.stringify(req.body))
	var fname = req.body.fname;
	var lname = req.body.lname;
	var address = req.body.address;
	var city = req.body.city;
	var state = req.body.state;
	var zip = req.body.zip
	var email = req.body.email
	var username = req.body.username;
	var password = req.body.password;

	var sql = "INSERT INTO Users (fname, lname, address, city, state, zip, email, username, password) VALUES (?,?,?,?,?,?,?,?,?)";
	con.query(sql, [fname, lname, address, city, state, zip, email, username, password], function (err, result) {
	if (err){
		res.json({"message": "The input you provided is not valid"})
	}
	else{
		res.json({"message": fname + " was registered successfully"})
	}
	});

}) //RegisterUser ends


// UpdateInfo
app.post('/updateInfo', function(req,res){
	console.log('Entering updateInfo'+JSON.stringify(req.body))
	var fname = req.body.fname;
	var lname = req.body.lname;
	var address = req.body.address;
	var city = req.body.city;
	var state = req.body.state;
	var zip = req.body.zip
	var email = req.body.email
	var username = req.body.username;
	var password = req.body.password;

	var fname1 = null;
	var lname1 = null;
	var address1 = null;
	var city1 = null;
	var state1 = null;
	var zip1 = null;
	var email1 = null;
	var username1 = null;
	var password1 = null;

	if(!req.session.loggedin){
			res.json({
						"message": "You are not currently logged in"	
				})
	}

	con.query('select * from Users where username=?', [username], (errors, results, fields) => {
				if (errors) {
						res.json({
								"message": "The input you provided is not valid"
						})
				}
				else if (results.length > 0) {
			fname1 = results[0].fname;
			lname1 = results[0].lname;
			address1 = results[0].address;
			city1 = results[0].city;
			state1 = results[0].state;
			zip1 = results[0].zip;
			email1 = results[0].email;
			password1 = results[0].password;
				}
		});


	if(!fname){
		fname = fname1;
	}
	if(!lname){
		lname = lname1;
	}
	if(!address){
		address = address1;
	}
	if(!city){
		city = city1;
	}
	if(!state){
		state = state1;
	}
	if(!zip){
		zip = zip1;
	}
	if(!email){
		email = email1;
	}
	if(!password){
		password = password1;
	}

	var sql = "UPDATE Users set fname=?, lname=?, address=?, city=?, state=?, zip=?, email=?, password=? WHERE Username=?";
	con.query(sql, [fname, lname, address, city, state, zip, email, password, username], function (err, result) {
		if (err){
					res.json({
									"message": "The input you provided is not valid"
					})
		}
		else{
			console.log("1 record inserted");
			res.json({"message":fname + " your information was successfully updated"})
		}
	});

}) // UpdateInfo ends


//ViewUser
app.post('/viewUsers', function(req,res){
	console.log('Entering viewUsers'+JSON.stringify(req.body))
	var fname = req.body.fname;
	var lname = req.body.lname;

	if(!fname){
		fname = '%'
	}
	else{
		fname = fname + '%'
	}

	if(!lname){
		lname = '%'
	}
	else{
		lname = lname + '%'
	}

	//Check if logged in
	if(!req.session.loggedin){
			res.json({
						"message": "You are not currently logged in"	
				})
	}
	else if(req.session.username != 'jadmin'){
		res.json({
						"message": "You must be an admin to perform this action"	
				})
	}
	else{
		sql_query = 'select fname, lname, id from Users where fname LIKE ? and lname LIKE ?'
		var q = con.query(sql_query, [fname, lname], (errors, results, fields) => {
					if (errors) {
							res.json({
								"message": "The input you provided is not valid"
						})
					}
					if (results.length > 0) {
							res.json({"message": "The action was successful", "user":results
							})
					}
					else{
						res.json({
							"message": "There are no users that match that criteria"
						})
					}
			});
	}

}) //ViewUser ends


function pr_query( sql, args ) {
    return new Promise( ( resolve, reject ) => {
        con.query( sql, args, ( err, rows ) => {
            if ( err )
                return reject( err );
            resolve( rows );
        } );
    } );
}

//addProducts
app.post('/addProducts', function(req,res){
	console.log('Entering addProducts'+JSON.stringify(req.body))
	var asin = req.body.asin;
	var productName = req.body.productName;
	var productDescription = req.body.productDescription;
	var productGroup = req.body.group;
	var productQuantity = 1;

	// check if user logged in
	if(!req.session.loggedin){
			return res.json({
						"message": "You are not currently logged in"	
				})
	}

	else if(req.session.username != 'jadmin'){
		res.json({
						"message": "You must be an admin to perform this action"	
				})
	}

	else{
		var sql = "select productQuantity from Products where asin = ?";

		pr_query( sql, [asin] )
	    .then( rows => {
	    	if(rows==0){
	    		var sql = "INSERT INTO Products (asin, productName, productDescription, productGroup) VALUES (?,?,?,?)";
	    		return pr_query( sql, [asin, productName, productDescription, productGroup] );
	    	}
	    	else{
	    		productQuantity = Number(rows[0].productQuantity)+1;
	    		var sql = "Update Products set productQuantity = ? where asin = ?";
	    		return pr_query( sql, [productQuantity, asin] );
	    	}
	    } )
	    .then( rows => {
	    	res.json({"message":productName + " was successfully added to the system"})
	    }, err => {
	    	console.log(err)
	    	res.json({"message": "The input you provided is not valid"})
	    } )
	    .catch( err => {
	       	res.json({"message": "Something broke probably"})
	    } )
	}

}) //addProducts ends


// modifyProducts
app.post('/modifyProduct', function(req,res){
	console.log('Entering modifyProduct'+JSON.stringify(req.body))
	var asin = req.body.asin;
	var productName = req.body.productName;
	var productDescription = req.body.productDescription;
	var productGroup = req.body.group;

	// check if user logged in
	if(!req.session.loggedin){
			return res.json({
						"message": "You are not currently logged in"	
				})
	}

	else if(req.session.username != 'jadmin'){
		res.json({
						"message": "You must be an admin to perform this action"	
				})
	}

	else{
		var sql = "UPDATE Products set productName=?, productDescription=?, productGroup=? WHERE asin=?";
		con.query(sql, [productName, productDescription, productGroup, asin], function (err, result) {
			if (err){
					res.json({
								"message": "The input you provided is not valid", "error": err
						})
			}
			else{
				res.json({"message":productName + " was successfully updated"})
			}

		});
	}
}) //modifyProducts ends


//ViewProducts
app.post('/viewProducts', function(req,res){
	console.log('Entering viewProducts'+JSON.stringify(req.body))
	var asin = req.body.asin;
	var keyword = req.body.keyword;
	var group = req.body.group;

	if(!asin){
		asin = '%'
	}

	if(!keyword){
		keyword = '%'
	}
	else{
		keyword = '%' + keyword + '%'
	}

	if(!group){
		group = '%'
	}
	else{
		group = '%' + group + '%'
	}

	sql_query = 'select asin, productName from Products where asin LIKE ? and (productDescription like ? or productName like ?) and productGroup like ?'
	var q = con.query(sql_query, [asin, keyword, keyword, group], (errors, results, fields) => {
				if (errors) {
						console.log(errors)
						res.json({
						"message": "There are no products that match that criteria"
				})
				}
				else if (results.length > 0) {
						res.json({"product": results})
				}
				else{
					res.json({
						"message": "There are no products that match that criteria"
					})
				}
		});


}) //ViewProducts ends

//Products Purchased
app.post('/productsPurchased', function(req,res){
	console.log('Entering productsPurchased'+JSON.stringify(req.body))
	var uname = req.body.username;
			
		if(!req.session.loggedin){
				res.json({"message" :"You are not currently logged in"})
		}
		else if(req.session.username != 'jadmin'){
		res.json({
						"message": "You must be an admin to perform this action"	
				})
	}
	else if(!uname){
		res.json({
						"message": "There are no users that match that criteria"	
				})
	}
		else {
				q = 'select productName, sum(productQuantity) as quantity from Purchase where username = ? group by productID'
				con.query(q, [uname],(errors, results, fields) => {
						if (errors == null){
								res.json({
										"message": "This action was successful","products":results
								})
						}
						else{
								console.log(errors)
								res.json({
										"message":"There are no users that match that criteria"
								})              
								 
							}
						
				})

		} 
}) //Products purchased ends


//Purchase Products
app.post('/buyProducts', function(req,res){
	console.log('Entering buyProducts'+JSON.stringify(req.body))
	var products = req.body.products;
	var count = req.body.products.length;
	var flag = 0;
	var product_Name = null;
	var r_count = Array.from({length: count}, (v, k) => k+1);

	var asin_list = [];
	var asin_purchase_list = [];

	for(var i =0; i<count; i++){
		asin_list.push(req.body.products[i].asin)
	}

	if(!req.session.loggedin){
			res.json({
						"message": "You are not currently logged in"	
				})
	}

	else{
		var purchase_id = 1;
		var flag = 0;

		var sql = "select max(purchaseID) as max_purchase_id from Purchase;";

		pr_query( sql )
		.then( rows => {
			if(rows!=0){
				purchase_id = Number(rows[0].max_purchase_id) + 1;
			}

			var sql = "select productQuantity, productName, asin from Products where asin in (?)";

			return pr_query( sql, [asin_list] )
		})
	    .then( rows => {

	    	query_string = '';

	    	for(var i=0; i<rows.length; i++){ //iterate through all results
	    		if(rows[i].productQuantity>0){  //check if sufficient quantitu
	    			if(flag==1)
	    				query_string = query_string + ',';

 					query_string = query_string + '('+ req.session.userId + ', \'' + req.session.username + '\',' + purchase_id + ',\'' + rows[i].productName + '\',\'' + rows[i].asin + '\')'; 
					flag = 1;
					asin_purchase_list.push(rows[i].asin);
	    			// Generate query string to update purchase table and reduce quantity from products table
	    		}
	    	}

	    	if(flag==0){
				res.json({"message": "There are no products that match that criteria"})
				return Promise.resolve();
	    	}
	    	else{
		    	var sql_query = 'INSERT INTO Purchase(userID, username, purchaseID, productName, productId) VALUES ' + query_string;
		    	var product_quantity_sql = 'Update Products set productQuantity = productQuantity - 1 where asin in (?)';
		    	return pr_query( sql_query )
		    	.then( rows => {
					return pr_query(product_quantity_sql, [asin_purchase_list])
		    	}, err => {
	    			console.log(err)
	    			res.json({"message": "The input you provided is not valid"})
	    		})
		    	.then( rows => {
	    			res.json({"message": "The action was successful"})
	    			return Promise.resolve();
	    		}, err => {
	    			console.log(err)
	    			res.json({"message": "The input you provided is not valid"})
	   			})
	    	}

	    }, err => {
	    	console.log(err)
	    	res.json({"message": "The input you provided is not valid"})
	    } )
	    .catch( err => {
	       	res.json({"message": "Something broke probably"})
	    } )
	}

}) //Purchase products ends


//Get Recommendations
app.post('/getRecommendations', function(req,res){
	console.log('Entering getRecommendations'+JSON.stringify(req.body))
	var asin = req.body.asin;

	if(!req.session.loggedin){
			res.json({
						"message": "You are not currently logged in"	
				})
	}

	sql_query = 'select productId as asin from Purchase where purchaseId in (select purchaseId from Purchase where productId=?) group by productId order by count(productId) desc LIMIT 5'

	var q = con.query(sql_query, [asin], (errors, results, fields) => {
				if (errors) {
						res.json({
						"message": "The input you provided is not valid"
					})
					console.log(q.sql)
				}
				else if (results.length > 0) {
						res.json({"message": "The action was successful", "products":results
						})
						console.log(results)
				}
				else{
					res.json({
						"message": "There are no recommendations for that product"
					})
					console.log(results)
				}
		});

}) //getRecommendations ends



// Starting server
var server = app.listen(3000, function () {
	 var host = server.address().address
	 var port = server.address().port
	 console.log("Example app listening at http://%s:%s", host, port)
})


