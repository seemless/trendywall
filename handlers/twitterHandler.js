var glossary = require("glossary")({
    collapse: true,
    blacklist: ["rt", "http", "www"]
});

var twitterHandler = function (dbModel) {
        var keywordsModel = dbModel;
        // Load nTwitter Library for easy Twitter API access.
        var twitter = require("ntwitter");
        var tconf = require("../conf/twitconf");
        var twit = new twitter(tconf.getConf());

        var request = require("request");

        var latestTweetWithLoc = null;
        var tStream = null;
        var tStreamEmitter = null;
        var sentRecently = false;

        var events = require('events');
        var myEmitter = new events.EventEmitter();
        var currentKeywordsString = '';

        var startStreamToClient = function (req, res) {
                // Setup an Event-Stream to Client
                res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                });
                res.write('\n');

                myEmitter.once('streamFromTwitterActive', function () {
                    console.log("Client Sending Started");
                    // Used to rate-limit sending of events to the client.
                    var sentRecently = false;

                    var callback = function (t) {
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

                            console.log("Sent Tweet");

                            // Rate Limiting
                            sentRecently = true;
                            setTimeout(function () {
                                sentRecently = false;
                            }, 5000);
                        }
                    };

                    // Queue up the action for when we lose Client Connection
                    req.on("close", function() {
                        console.log("INFO: Received Browser Close Event. Shutting Down Stream To Client.");
                        res.end();
                        tStreamEmitter.removeListener('data', callback);
                    });

                    if(tStreamEmitter) {
                        tStreamEmitter.on('data', callback);
                    } else {
                        console.log("ERROR: Couldn't start stream to client because there's no stream from Twitter.");
                    }



                });
            };


        var startStreamFromTwitter = function () {
                // Build the Keywords String from the active keywords in the DB
                var newKeywordsString = '';
                keywordsModel
                    .find({isActive: true})
                    .sort({keyword: 1})
                    .exec(function (err, results) {
                        for(var i in results) {
                            newKeywordsString += results[i].keyword + ',';
                        }
                        newKeywordsString = newKeywordsString.slice(0, newKeywordsString.length - 1);

                        console.log(newKeywordsString);
                        myEmitter.emit('keywordsStringUpdated');
                    });

                myEmitter.on('keywordsStringUpdated', function () {
                    if(newKeywordsString === '') {
                        console.error("ERROR: No Keywords. Can't start Twitter Stream.");
                        if(tStreamEmitter) tStreamEmitter.destroy();
                        return;
                    } else if((newKeywordsString === currentKeywordsString) && tStreamEmitter) {
                        console.info("INFO: Keywords Unchanged. No need to restart stream from Twitter.");
                        return;
                    } else {
                        // Store the New Keywords
                        currentKeywordsString = newKeywordsString;

                        // Close the old connection.
                        if(tStreamEmitter) tStreamEmitter.destroy();

                        // Build the connection to Twitter
                        tStream = twit.stream('statuses/filter', {
                            track: currentKeywordsString
                        }, function (streamEmitter) {
                            tStreamEmitter = streamEmitter;

                            streamEmitter.on('error', function (data, details) {
                                console.error("ERROR: Twitter streamEmitter Error -> ", data, details);
                            });

                            streamEmitter.on('data', function (t) {
                                if(t.text) {
                                    myEmitter.emit('streamFromTwitterActive');

                                    var text = t.text;

                                    // Remove "RT @xxxx" (retweet) tags
                                    text = text.replace(/RT\s@(\S+)\s/ig, '');

                                    // Remove HTML entities
                                    text = text.replace(/&(\w+);/ig, '');

                                    // Remove single numbers (not meaningful to us...)
                                    text = text.replace(/\s([0-9]+)\s/ig, '');

                                    // Remove Hyperlinks
                                    var urlRegEx = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
                                    text = text.replace(urlRegEx, '');

                                    // Remove non-alphanumeric characters
                                    text = text.replace(/\W/ig, ' ');

                                    var tweetWords = glossary.extract(text);
                                    //var tweetWords = text.split(' ');

                                    // Find the keywords this was for.
                                    keywordsModel.find({
                                        isActive: true
                                    }, function (err, activeKeywords) {
                                        if(err) console.error("ERROR: Storing Tweet returned Error!", err);
                                        for(var i in activeKeywords) {
                                            // If the keyword is in this tweet, store the tweet in this keyword's bank.
                                            for(var j in tweetWords) {
                                                if(tweetWords[j] == activeKeywords[i].keyword) {
                                                    activeKeywords[i].addText(tweetWords);
                                                    //console.info("INFO: Stored tweet text under keyword ", activeKeywords[i].keyword);
                                                    break;
                                                }
                                            }
                                        }
                                    });

                                    // If this tweet has location info, store it for the Maps feature.
                                    if(t.coordinates || t.user.location) {
                                        latestTweetWithLoc = t;
                                    }

                                } else {
                                    console.log(t);
                                }
                            });

                            streamEmitter.on('limit', function (limit) {
                                console.log(limit);
                            });
                        });

                        console.log("INFO: Stream from Twitter Started.");
                    }
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
                            if(error) console.error(error);
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
            startStreamFromTwitter: startStreamFromTwitter,
            startStreamToClient: startStreamToClient,
            getGeoTweet: getGeoTweet
        };
    };

module.exports = twitterHandler;