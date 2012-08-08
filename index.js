var express = require("express");
var app = express();
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
         res.end(body) // Print the google tech news webpage
            }
        })
    });

app.get("/geocode/:id",function(req,res)
    {
        request('https://maps.googleapis.com/maps/api/geocode/json?address='+req.params["id"]+'&sensor=false', function (error, response, body) {
        res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
                });
            res.end(body);
        })
    });    
    
app.get("/tweets/:query",function(req,res)
    {
            twitter.get('search', { q: req.params["query"], result_type: 'mixed', geocode:"39.4,-76.6,1000mi", lang: 'en', page:1, rpp:12 }, function(err, reply) {
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
    
    
//if we want to send raw json to the browser, otherwise use /kml to send gearth formatted kml result back
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

//we'll use this to send the most recent tweet with the mentioned query and return the result as a kml file
app.get("/kml/:query",function(req,res)
{       
    twitter.get('search', { q: req.params["query"], result_type: 'recent', geocode:"39.4,-76.6,10000mi", lang: 'en', page:1, rpp:2 }, function(err, reply) {
    if (err!==null || reply ==null){
            console.log("Errors:",err);
        }
        else{
    try{
            var name = reply.results[0].from_user;
        var description = reply.results[0].text;
        var place = reply.results[0].location;
        var placeNormalized = place; //if google provides a normalized address it will be set here, otherwise its just what the twitter user reported
        var time = reply.results[0].created_at;
        var img = reply.results[0].profile_image_url;
        var lat = "";
        var lng = "";
        var coordinates = "";       
        var resultsJSON = {};
        
        //we're checking each location against the google web decoder
         //https://maps.googleapis.com/maps/api/geocode/json?address=TWITLOCATION&sensor=false
         if(place != null && place != ''){
        request('https://maps.googleapis.com/maps/api/geocode/json?address='+place+'&sensor=false', function (error, response, body) {
            var strjson = ""+body+"";
            resultsJSON = JSON.parse(strjson);
            if (resultsJSON.status == 'OK'){
            lat = resultsJSON.results[0].geometry.location.lat;
            lng = resultsJSON.results[0].geometry.location.lng;
            coordinates = lng+","+lat+",0";
            placeNormalized = resultsJSON.results[0].formatted_address;
           
            var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://earth.google.com/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Style id="My_Style">\
            <IconStyle><scale>1.8</scale><Icon><href>'+img+'</href></Icon></IconStyle>\
            <BalloonStyle>\
            <bgColor>00eeeeee</bgColor> <textColor>000000</textColor>\
            <text><![CDATA[ $[name] <HR> $[description]\
            ]]> </text>\
            </BalloonStyle>\
            </Style>\
            <Placemark>\
            <name>'+placeNormalized+'</name>\
            <LookAt>\
                <longitude>'+lng+'</longitude>\
                <latitude>'+lat+'</latitude>\
                <altitude>0</altitude>\
                <range>6000000</range>\
            </LookAt>\
            <description><![CDATA[\
            <table width="400" height="100"><tr><td><img src="'+img+'"/></td>\
            <td><span style="font-size:16px;"><b>'+name+'</b>:'+description+'</span></td></tr>\
            <tr><span style="font-size:12px;">Posted from '+place+' - '+time+'</span></tr>\
            </table>]]>\
            </description>\
            <gx:balloonVisibility>1</gx:balloonVisibility>\
            <styleUrl>#My_Style</styleUrl>\
            <Point>\
                <coordinates>'+coordinates+'</coordinates>\
            </Point>\
            </Placemark>\
            </Document>\
            </kml>';
        
            res.writeHead(200, {
            "Content-Type": "application/xml",
            "Access-Control-Allow-Origin": "*"
            });
            
            res.end(kml);
            }
        })    
        }else {
            res.writeHead(500);
            res.end(error);
        }
      
    }
    catch(err){
        console.log(err);
    }
        }
    });
});   
    
    
app.get("/earth",function(req,res)
    {
        res.render("earth.ejs", { layout: false});
        
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

app.get("/trendywall",function(req,res)
    {
           twitter.get('search', { q: 'cybersecurity'}, function(err, reply) {
            console.log("Errors:",err);
          res.render("trendywall.ejs", { layout: false, twitter_results:JSON.stringify(reply)});

        });           
        
        
    });
    

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);