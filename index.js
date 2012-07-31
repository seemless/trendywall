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
    
    
    app.get("/googleTopTechNews",function(req,res)
    {
        request('http://news.google.com/news?pz=1&cf=all&ned=us&hl=en&topic=tc&output=html', function (error, response, body) {
        if (!error && response.statusCode == 200) {
         res.end(body) // Print the google web page.
            }
        })
    });
    
    
app.get("/tweets/:query",function(req,res)
    {
            twitter.get('search', { q: req.params["query"], result_type: 'mixed', geocode:"39.4,-76.6,10000mi", lang: 'en', page:1, rpp:12 }, function(err, reply) {
          if (err!==null){
                console.log("Errors:",err);
            }
            else{
            var tweetToHTML = "";
            for (key in reply.results){
      
                
tweetToHTML += "<div style='border-bottom:1px solid #777; padding-bottom:10px; display:block; position:relative;'>\
                <a class><img width='48' height='48' src='"+reply.results[key].profile_image_url+"' style='float:left; background: black; border-top: 1px solid #333;\
                border-left: 1px solid #333; border-bottom: 1px solid #666; border-right: 1px solid #666;'/></a>\
                <div style='display:block; margin-left:60px;'><p>"+reply.results[key].text+"</p>\
                <b>"+reply.results[key].from_user+"</b> - "+reply.results[key].location+"</div>\
                </div>";
            
            }
            res.end(tweetToHTML);
            }
            
        });           
    });
    
app.get("/geoTweets/:query",function(req,res)
    {
            twitter.get('search', { q: req.params["query"], result_type: 'mixed', geocode:"39.4,-76.6,10000mi", lang: 'en', page:1, rpp:8 }, function(err, reply) {
          if (err!==null){
                console.log("Errors:",err);
            }
            else{
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
                });
            res.end(JSON.stringify(reply));
            }
            
        });           
    });
    
    
app.get("/earth",function(req,res)
    {
        res.render("earth.ejs", { layout: false});
        
    });

app.get("/kml",function(req,res)
    {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\
<Placemark>\
    <name>Disney World Monorail Crash Kills Employee</name>\
    <address>Orlando, FL</address>\
    <Snippet maxLines="0"></Snippet>\
    <description><![CDATA[<table style="font-size: 11; font-family: Arial, Verdana, Sans" width="244"><tr><td><img src="http://wwwimage.cbsnews.com/common/images/v2/logo_cbsnews_small.gif" border="0"><br/>\
    <a href="http://www.cbsnews.com/stories/2009/07/05/national/main5134239.shtml">\
    <img src="http://wwwimage.cbsnews.com/images/2009/07/05/image5134238g.jpg" width="244" height="183" border="0" style="margin-top: 6px;"></a>\
    <div align="right">Photo: AP</div>\
    <span style="font-size: 18; font-family: Arial, Verdana, Sans; color: #333;"><b></b></span><br/>\
    <span style="color: #333;">Walt Disney World says a monorail at the Florida theme park is out of service after an employee death.\
    <a href="http://www.cbsnews.com/stories/2009/07/05/national/main5134239.shtml" style="font-size: 11; font-family: Arial, Verdana, Sans; color: #039;">Read more...</a></span>\
    <hr size="1" color="#DDDDDD"/><a href="http://www.cbsnews.com/" style="font-size: 11; font-family: Arial, Verdana, Sans; color: #039;">Get the latest news from CBSNews.com</a><hr size="1" color="#DDDDDD"/></div>\
    © MMIX The Associated Press. All Rights Reserved. This material may not be published, broadcast, rewritten, or redistributed. \
    </td></tr></table><font color="#ffffff">]]></description>\
    <styleUrl>#7328</styleUrl>\
    <gx:balloonVisibility>1</gx:balloonVisibility>\
    <MultiGeometry>\
        <Point>\
            <coordinates>-81.37923600000001,28.538336,0</coordinates>\
        </Point>\
        <LinearRing>\
            <coordinates>\
                -81.37923600000001,28.538336,0 -81.37923600000001,28.538336,0 -81.37923600000001,28.538336,0 -81.37923600000001,28.538336,0 -81.37923600000001,28.538336,0 \
            </coordinates>\
        </LinearRing>\
    </MultiGeometry>\
</Placemark>\
</kml>'

res.writeHead(200, {
                "Content-Type": "application/xml",
                "Access-Control-Allow-Origin": "*"
                });
            res.end(kml);

        
    });

app.get("/news", function(req,res)
    {   
        twitter.get('search', { q: "BreakingNews", result_type: 'recent', lang: 'en', page:1, rpp:8 }, function(err, reply) {
            if (err!==null){
                console.log("Errors:",err);
            }
            else{
                var tweetToHTML = "";
                for (key in reply.results){
                    tweetToHTML += "@"+reply.results[key].from_user +": "+reply.results[key].text+"... ";
                }
                //tweetToHTML += "</p>";
                res.end(tweetToHTML);
            }
        });

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
app.listen(3000);