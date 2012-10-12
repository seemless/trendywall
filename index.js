var express = require("express");
var app = express();
var twit = require("twit");
var tconf = require("./conf/twitconf"); //config file for twitter
var request = require("request"); //for doing http gets.. in this case to get google top 10
var twitter = new twit(tconf.getConf())
var Flickr = require('flickr').Flickr;
var fconf = require("./conf/flickrconf");
var flickrKey = fconf.getConf()['consumer_key'];
var flickrSecret = fconf.getConf()['consumer_sercret'];
var flickr= new Flickr(flickrKey, flickrSecret);



var ozone = require("./routes/ozone-handlers.js");


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
});

// Serve static files
app.use("/static", express.static(__dirname + '/static'));

app.get('/ozone/tweetStream/:topic', function(req, res){
  res.render('twitterStream.jade',{topic:req.params.topic});
});

app.get('/ozone/tweets/:query', ozone.tweets);
app.get('/ozone/breakingNews', ozone.breakingNews);
app.get('/ozone/streamTweets/:topic', ozone.streamTweets);


    
//we'll use this to send the most recent tweet with the mentioned query and return the result as a kml file
app.get("/kml/:query",function(req,res)
{
    var randomTweetNumber = Math.floor(Math.random()*80);
    //var randomTweetPage = Math.floor(Math.random()*8);
    twitter.get('search', { q: req.params["query"], result_type: 'mixed', geocode:"39.4,-76.6,10000mi", lang: 'en', page:1, rpp:80 }, function(err, reply) {
    if (err!==null || reply ==null){
            console.log("Errors:",err);
        }
        else{
    try{
	//console.log("Random GeoTweet Page#"+randomTweetPage);
	console.log("Random GeoTweet#"+randomTweetNumber);
        var name = reply.results[randomTweetNumber].from_user;
        var description = reply.results[randomTweetNumber].text;
        var place = reply.results[randomTweetNumber].location;
        var placeNormalized = place; //if google provides a normalized address it will be set here, otherwise its just what the twitter user reported
        var time = reply.results[randomTweetNumber].created_at;
        var img = reply.results[randomTweetNumber].profile_image_url;
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
        
	console.log(kml);
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
    

app.get("/trendywall",function(req,res)
    {
          res.render("trendywall.ejs", { layout: false });
    });


app.get("/flickr/:query/:tagMode", function(req,res)
	{
	var pixel_map = {"s":"75","q":"150","t":"100","m":"240","n":"320",
			"-":"500","z":"640","c":"800","b":"1024","o":"500"};
			
	var mode = req.params['tagMode'];
	console.log("mode:" + mode);
	//Only valid tag_modes are 'any' or 'all', default to 'any'
	if (mode !== "all" || mode !== "any"){
		mode = "any";
	}

	var query = encodeURIComponent(req.params['query'].replace(","," "));
	console.log(query);
	flickr.executeAPIRequest("flickr.photos.search",{tags:query,tag_mode:mode},true, function(err, reply){
                
		if(err!==null){
			console.log("errors in getting flickr photos"+err);
		}
		else{
			var picsToHTML = '';
			var imgTagBeg = "<img src='"
			var imgTagEndOne = "' class='active' />";
			var imgTagEngOther = "' />";
			var i = 0;
			if (reply.photos.total < 100){
				i = reply.photos.total;
			}
			else{
				i = 100;
			} 
			for(var k=0; k<i; k++){
			//http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
				var p = reply.photos.photo[k];
				var title = p.title;
				var src = "http://farm"+p.farm+".staticflickr.com/"+p.server+"/"+p.id+"_"+p.secret+".jpg";
				if (k == 1){
					picsToHTML += imgTagBeg + src + imgTagEndOne;		
				}
				else{
					picsToHTML += imgTagBeg + src + imgTagEngOther;
				}
			}
			if(!picsToHTML){
				picsToHTML = "<p>No photos were found matching your query.</p>"
			}
			//console.log(picsToHTML);
			res.end(picsToHTML);
		}
	});
});



//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);
