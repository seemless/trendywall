var express = require("express");
var app = express();

var twitter = require("ntwitter");
var tconf = require("./conf/twitconf"); //config file for twitter
var twit = new twitter(tconf.getConf());

var request = require("request"); //for doing http gets.. in this case to get google top 10
var Flickr = require('flickr').Flickr;
var fconf = require("./conf/flickrconf");
var flickrKey = fconf.getConf()['consumer_key'];
var flickrSecret = fconf.getConf()['consumer_sercret'];
var flickr = new Flickr(flickrKey, flickrSecret);
var glossary = require("glossary")({
    verbose: true,
    collapse: true,
    minFreq: 2
});
var FeedParser = require('feedparser');
var async = require('async');

//I guess this is the only way to include client side scripts and css?
//they would go here
// Serve static files
app.use("/static", express.static(__dirname + '/static'));

// route routing is very easy with express, this will handle the request for root directory contents.
// :id is used here to pattern match with the first value after the forward slash.
app.get("/googleTop10Trends", function(req, res) {
    request('http://www.google.com/trends/hottrends/atom/hourly', function(error, response, body) {
        if(!error && response.statusCode == 200) {
            res.end(body); // Print the google web page.
        }
    });
});


app.get("/googleTopWorldNews", function(req, res) {
    request('http://news.google.com/news/section?pz=1&cf=all&ned=us&topic=w&output=html', function(error, response, body) {
        if(!error && response.statusCode == 200) {
            res.end(body); // Print the google world news webpage
        }
    });
});


app.get("/googleTopTechNews", function(req, res) {
    request('http://news.google.com/news?pz=1&cf=all&ned=us&hl=en&topic=tc&output=html', function(error, response, body) {
        if(!error && response.statusCode == 200) {
            res.end(body); // Print the google tech news webpage
        }
    });
});

var latestGeoTweet = null;

app.get("/tweets/:query", function(req, res) {
    // Setup an Event-Stream to Client
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n');

    // Build the connection to Twitter & serve Tweets to CLient
    console.log("INFO: Twitter Stream Started.");
    var tStream = twit.stream('statuses/filter', {
        track: req.params["query"]
    }, function(stream) {
        // Used to rate-limit sending of events to the client.
        var sentRecently = false;

        stream.on('error', function(data, details) {
            console.log("ERROR: Twitter Stream Error -> ", data, details);
        });

        // If we lose the connection to the client, stop pulling tweets & end processing for this "app.get";
        req.on("close", function() {
            console.log("INFO: Received Browser Close Event. Shutting Down Twitter Stream.");
            stream.destroy(); // Important! If we don't destroy this, Twitter gets angry...
            res.end();
        });

        stream.on('data', function(t) {
            if(t.text) {
                // If this tweet has location info, store it for the Maps feature.
                if(t.coordinates || t.user.location) {
                    latestGeoTweet = t;
                }
                // Check to be sure rate-limit flag isn't set.
                if(!sentRecently) {
                    // Only compile the information we need to send
                    // (Tweet objects are huge!)
                    var smallTweet = {
                        "user": t.user.name,
                        "img_url": t.user.profile_image_url,
                        "coordinates": t.coordinates,
                        "text": t.text
                    };
                    // Send Data to Client
                    res.write("data: " + JSON.stringify(smallTweet) + '\n\n');

                    // Rate Limiting
                    sentRecently = true;
                    setTimeout(function() {
                        sentRecently = false;
                    }, 5000);
                }
            } else {
                console.log(t);
            }
        });

        stream.on('limit', function(limit) {
            console.log(limit);
        });
    });
});

//we'll use this to send the most recent tweet with the mentioned query and return the result as a kml file
app.get("/tweetForMap", function(req, res) {
    var t = latestGeoTweet;
    // Until a tweet with location comes in, we can't continue.
    if(!t) {
        console.log("INFO: GeoTweet Unavailable.");
        res.end();
        return;
    }

    try {
        if(t.coordinates){
            // If we have Lat/Long, Reverse Geocode w/ Google to get a Proper Address
            latLng = t.coordinates.coordinates[1] + ',' + t.coordinates.coordinates[0];
            request('http://maps.googleapis.com/maps/api/geocode/json?latlng='+latLng+'&sensor=false',
                function(error, response, body){
                    resultsJSON = JSON.parse(body);
                    if(resultsJSON.status == 'OK') {
                        t.address = resultsJSON.results[0].formatted_address;
                        res.end(JSON.stringify(t));
                        t = null;
                        console.log("INFO: Sent GeoTweet.");
                    } else {
                        console.log("ERROR: Geocode Error -> ", resultsJSON);
                    }
                }
            );
        } else if(t.user.location) {
            // If we only have an address (or City/State), Geocode w/ Google for a lat/Long
            request('https://maps.googleapis.com/maps/api/geocode/json?address=' + t.user.location + '&sensor=false',
                function(error, response, body) {
                    resultsJSON = JSON.parse(body);
                    if(resultsJSON.status == 'OK') {
                        // Add a little variance so the placemarks don't stack.
                        lat = resultsJSON.results[0].geometry.location.lat + (Math.random()-0.5)/2;
                        lng = resultsJSON.results[0].geometry.location.lng + (Math.random()-0.5)/2;
                        t.coordinates = {"coordinates": [lng, lat], "type": "point"};
                        t.address = resultsJSON.results[0].formatted_address;
                        res.end(JSON.stringify(t));
                        t = null;
                        console.log("INFO: Sent GeoTweet.");
                    } else {
                        console.log("ERROR: Geocode Error -> ", resultsJSON);
                    }

                }
            );
        } else {
            res.end();
        }

    } catch(err) {
        console.error(err);
    }
});

app.get("/news", function(req, res) {
    // twitter.get('search', {
    //     q: "BreakingNews",
    //     result_type: 'recent',
    //     lang: 'en',
    //     page: 1,
    //     rpp: 8
    // }, function(err, reply) {
    //     if(err !== null) {
    //         console.log("Errors:", err);
    //     } else {
    //         var tweetToHTML = "";
    //         for(var key in reply.results) {
    //             tweetToHTML += "@" + reply.results[key].from_user + ": " + reply.results[key].text + "... ";
    //         }
    //         //tweetToHTML += "</p>";
    //         res.end(tweetToHTML);
    //     }
    // });
});

app.get("/trendywall", function(req, res) {
    res.render("trendywall.ejs", {
        layout: false
    });
});


app.get("/flickr/:query/:tagMode", function(req, res) {
    var pixel_map = {
        "s": "75",
        "q": "150",
        "t": "100",
        "m": "240",
        "n": "320",
        "-": "500",
        "z": "640",
        "c": "800",
        "b": "1024",
        "o": "500"
    };

    var mode = req.params['tagMode'];
    console.log("mode:" + mode);
    //Only valid tag_modes are 'any' or 'all', default to 'any'
    if(mode !== "all" || mode !== "any") {
        mode = "any";
    }

    var query = encodeURIComponent(req.params['query'].replace(",", " "));
    console.log(query);
    flickr.executeAPIRequest("flickr.photos.search", {
        tags: query,
        tag_mode: mode
    }, true, function(err, reply) {

        if(err !== null) {
            console.log("errors in getting flickr photos" + err);
        } else {
            var picsToHTML = '';
            var imgTagBeg = "<img src='";
            var imgTagEndOne = "' class='active' style='display: none;'/>";
            var imgTagEngOther = "' />";
            var i = 0;
            if(reply.photos.total < 100) {
                i = reply.photos.total;
            } else {
                i = 100;
            }
            for(var k = 0; k < i; k++) {
                //http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
                var p = reply.photos.photo[k];
                var title = p.title;
                var src = "http://farm" + p.farm + ".staticflickr.com/" + p.server + "/" + p.id + "_" + p.secret + ".jpg";
                if(k == 1) {
                    picsToHTML += imgTagBeg + src + imgTagEndOne;
                } else {
                    picsToHTML += imgTagBeg + src + imgTagEngOther;
                }
            }
            if(!picsToHTML) {
                picsToHTML = "<p>No photos were found matching your query.</p>";
            }
            //console.log(picsToHTML);
            res.end(picsToHTML);
        }
    });
});

// Word Cloud Word Generation
app.get("/getWordcloudWords", function(req, res) {
    res.type("text/plain");

    var textStringsArray = []; // Text to make the wordcloud from
    var feeds = ['http://english.aljazeera.net/Services/Rss/?PostingId=2007731105943979989' // Aljazeera English
    ];

    function parseFeed(d, callback) {
        var parser = new FeedParser();
        parser.parseUrl(d, function(error, meta, articles) {
            if(!error) {
                var out = "";
                for(var a in articles) {
                    out += " " + articles[a].description + " " + articles[a].summary + " " + articles[a].title;
                }

                // Store results from this feed.
                textStringsArray.push(out);

                // Done.
                callback(null, out);
            } else {
                console.error(error);
                callback(error, null);
            }
        });
    }

    async.forEach(feeds, parseFeed, function(err) {
        if(err) {
            console.error(err);
            res.end();
        } else {
            var s = "";
            for(var i in textStringsArray) {
                s += textStringsArray[i];
            }


            // Use Glossary to pick out important words & count them.
            var words = glossary.extract(s.toLowerCase());
            words.sort(function(a, b) {
                return b.count - a.count;
            });

            // Change the key names for JQCloud.
            for(var w in words){
                words[w].text = words[w].word;
                delete words[w].word;
                words[w].weight = words[w].count;
                delete words[w].count;
            }

            // Return.
            res.end(JSON.stringify(words));
        }
    });

});

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);