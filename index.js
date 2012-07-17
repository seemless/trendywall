var express = require("express");
var app = express.createServer();
var geohash = require("geohash").GeoHash;
var twit = require("twit");
var tconf = require("./conf/twitconf"); //config file for twitter
var request = require("request"); //for doing http gets.. in this case to get google top 10
var twitter = new twit(tconf.getConf())


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
            
app.get("/googleTop10Trends",function(req,res)
    {
        request('http://www.google.com/trends/hottrends/atom/hourly', function (error, response, body) {
        if (!error && response.statusCode == 200) {
         res.end(body) // Print the google web page.
      }
})
    });
    
    
app.get("/tweets/:query",function(req,res)
    {
            twitter.get('search', { q: req.params["query"], result_type: 'mixed' }, function(err, reply) {
          if (err!==null){
                console.log("Errors:",err);
            }
            else{
            var tweetToHTML = "";
            for (key in reply.results){
tweetToHTML += "<div style='border-bottom:1px solid #E2E2E2; padding:6px;'><img src='"+reply.results[key].profile_image_url+"' style='vertical-align:middle;margin:6px;'/>"+reply.results[key].from_user+" - "+reply.results[key].text+"+</div>";
            }
            res.end(tweetToHTML);
            }
            
        });           
    });
    
    
app.get("/earth",function(req,res)
    {
        res.render("earthDiv.ejs", { layout: false});
        
    });
    
//just to get drag/resize working
app.get("/trendywall",function(req,res)
    {
           twitter.get('search', { q: 'cybersecurity', since: '2011-11-11' }, function(err, reply) {
            console.log("Errors:",err);
          res.render("trendywall.ejs", { layout: false, twitter_results:JSON.stringify(reply)});

        });           
        
        
    });
    

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(process.env.PORT);