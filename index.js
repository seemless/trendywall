var express = require("express");
var app = express.createServer();
var geohash = require("geohash").GeoHash;

// route routing is very easy with express, this will handle the request for root directory contents.
// :id is used here to pattern match with the first value after the forward slash.
app.get("/maps/:id",function (req,res)
    {
                //decode the geohash with geohash module
		var latlon = geohash.decodeGeoHash(req.params["id"]);
		console.log("latlon : " + latlon);
		var lat = latlon.latitude[2];
		console.log("lat : " + lat);
		var lon = latlon.longitude[2];
		console.log("lon : " + lon);
		zoom = req.params["id"].length + 2;
		console.log("zoom : " + zoom);
                // now we use the templating capabilities of express and call our template to render the view, and pass a few parameters to it
		res.render("index.ejs", { layout: false, lat:lat, lon:lon, zoom:zoom, geohash:req.params["id"]});
	});
            
//app.get("/wordle",function(req,res)
//    {
//        res.render("wordle.ejs", { layout: false});
//    });
//    
//app.get("/googleTrends",function(req,res)
//    {
//        res.render("googleTrends.ejs", { layout: false});
//    });
//    
//app.get("/topGoogleTrendToTwitter",function(req,res)
//    {
//        res.render("topGoogleTrendToTwitter.ejs", { layout: false});
//    });
    
    
app.get("/earth",function(req,res)
    {
        res.render("earthDiv.ejs", { layout: false});
        
    });
    
//just to get drag/resize working
app.get("/trendywall",function(req,res)
    {
        res.render("trendywall.ejs", { layout: false});
        
    });
    
//working on dynamic loading of the divs here
app.get("/trendywall2",function(req,res)
    {
        res.render("trendywall2.ejs", { layout: false});
        
    });

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(process.env.PORT);