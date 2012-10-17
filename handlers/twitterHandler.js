var TwitterHandler = function () {
        // Load nTwitter Library for easy Twitter API access.
        var twitter = require("ntwitter");
        var tconf = require("../conf/twitconf");
        var twit = new twitter(tconf.getConf());

        var request = require("request");

        var wordBucket = "";
        var wordBucketWord = "";

        var latestTweetWithLoc = null;

        var getStream = function (req, res) {
                var searchTerms = req.param("searchTerms");
                if(!searchTerms) {
                    console.log("ERROR: Empty SearchTerms String. Can't start Twitter Stream.");
                    res.end("You must specify a Search Term for Twitter.");
                    return;
                }

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
                    track: searchTerms
                }, function (stream) {
                    // Used to rate-limit sending of events to the client.
                    var sentRecently = false;

                    stream.on('error', function (data, details) {
                        console.log("ERROR: Twitter Stream Error -> ", data, details);
                    });

                    // If we lose the connection to the client, stop pulling tweets & end processing for this "app.get";
                    req.on("close", function () {
                        console.log("INFO: Received Browser Close Event. Shutting Down Twitter Stream.");
                        stream.destroy(); // Important! If we don't destroy this, Twitter gets angry...
                        res.end();
                    });

                    stream.on('data', function (t) {
                        if(t.text) {
                            // Dump the tweet into the Word Bucket
                            wordBucket += ' ' + t.text;

                            // If this tweet has location info, store it for the Maps feature.
                            if(t.coordinates || t.user.location) {
                                latestTweetWithLoc = t;
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
                                setTimeout(function () {
                                    sentRecently = false;
                                }, 5000);
                            }
                        } else {
                            console.log(t);
                        }
                    });

                    stream.on('limit', function (limit) {
                        console.log(limit);
                    });
                });
            };

        var getGeoTweet = function (req, res) {
                var t = latestTweetWithLoc;
                // Until a tweet with location comes in, we can't continue.
                if(!t) {
                    console.log("INFO: GeoTweet Unavailable.");
                    res.end();
                    return;
                }

                try {
                    if(t.coordinates) {
                        // If we have Lat/Long, Reverse Geocode w/ Google to get a Proper Address
                        latLng = t.coordinates.coordinates[1] + ',' + t.coordinates.coordinates[0];
                        request('http://maps.googleapis.com/maps/api/geocode/json?latlng=' + latLng + '&sensor=false', function (error, response, body) {
                            resultsJSON = JSON.parse(body);
                            if(resultsJSON.status == 'OK') {
                                t.address = resultsJSON.results[0].formatted_address;
                                res.end(JSON.stringify(t));
                                t = null;
                                console.log("INFO: Sent GeoTweet.");
                            } else {
                                console.log("ERROR: Geocode Error -> ", resultsJSON);
                            }
                        });
                    } else if(t.user.location) {
                        // If we only have an address (or City/State), Geocode w/ Google for a lat/Long
                        request('https://maps.googleapis.com/maps/api/geocode/json?address=' + t.user.location + '&sensor=false', function (error, response, body) {
                            resultsJSON = JSON.parse(body);
                            if(resultsJSON.status == 'OK') {
                                // Add a little variance so the placemarks don't stack.
                                lat = resultsJSON.results[0].geometry.location.lat + (Math.random() - 0.5) / 2;
                                lng = resultsJSON.results[0].geometry.location.lng + (Math.random() - 0.5) / 2;
                                t.coordinates = {
                                    "coordinates": [lng, lat],
                                    "type": "point"
                                };
                                t.address = resultsJSON.results[0].formatted_address;
                                res.end(JSON.stringify(t));
                                t = null;
                                console.log("INFO: Sent GeoTweet.");
                            } else {
                                console.log("ERROR: Geocode Error -> ", resultsJSON);
                            }

                        });
                    } else {
                        res.end();
                    }

                } catch(err) {
                    console.error(err);
                }
            };

        return {
            getStream: getStream,
            getGeoTweet: getGeoTweet
        };

    }();

exports.handler = TwitterHandler;