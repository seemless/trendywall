// Global variables
var g_wordBucket = "";
var g_wordBucketWord = '';
var g_keywords = [];

// Constants
var MAX_BUCKET_LENGTH = 250000;

var express = require("express");
var app = express();

var request = require("request"); //for doing http gets.. in this case to get google top 10

var Flickr = require('flickr').Flickr;
var fconf = require("./conf/flickrconf");
var flickrKey = fconf.getConf()['consumer_key'];
var flickrSecret = fconf.getConf()['consumer_sercret'];
var flickr = new Flickr(flickrKey, flickrSecret);
var glossary = require("glossary")({
    verbose: true,
    collapse: true,
    minFreq: 5,
    blacklist: ["rt", "http", "www"]
});

var twitter = require("./handlers/twitterHandler.js");//({ wordBucket: g_wordBucket, wordBucketWord: g_wordBucketWord });
var ozone = require("./handlers/ozoneHandler.js");



// Setup
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
});


// Serve static files
app.use("/static", express.static(__dirname + '/static'));

// TODO: Do better than this...
app.get("/googleTopWorldNews", function(req, res) {
    request('http://news.google.com/news/section?pz=1&cf=all&ned=us&topic=w&output=html', function(error, response, body) {
        if(!error && response.statusCode == 200) {
            res.end(body); // Print the google world news webpage
        }
    });
});

// Note: app.all catches get, post, etc...
app.all('/ozone/twitterStream', function(req, res){
    res.render('twitterStream.jade');
});

// If not Ozone...
app.all('/twitterStream', function(req, res){
    twitter.handler.getStream(req, res);
});

app.all("/getGeoTweet", function(req, res) {
    twitter.handler.getGeoTweet(req, res);
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
app.get("/getWordcloudWords/:word", function(req, res) {
    res.type("text/plain");

    if(g_wordBucketWord != req.params['word'].toLowerCase()){
        g_wordBucket = "";
        g_wordBucketWord = req.params['word'].toLowerCase();
    }
    // Only keep the last MAX_BUCKET_LENGTH # of words...
    if(g_wordBucket.length > MAX_BUCKET_LENGTH){
        g_wordBucket = g_wordBucket.slice(g_wordBucket.length-MAX_BUCKET_LENGTH);
    }

    // Get links (so we can scrape them later...)
     var urlRegEx = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    // var links = g_wordBucket.match(urlRegEx);

    // function getLink(url) {
    //     jsdom.env({
    //         html: url,
    //         scripts: ["http://code.jquery.com/jquery.js"],
    //         done: function(errors, window) {
    //             var $ = window.$;
    //             $("script").remove();
    //             $("style").remove();
    //             g_wordBucket += $("body").text();
    //         }
    //     });
    // }

    // for(var l in links) {
    //     getLink(links[l]);
    // }

    //console.log(links);

    // Remove "RT @xxxx" (retweet) tags
    g_wordBucket = g_wordBucket.replace(/RT\s@(\S+)\s/ig, '');

    // Remove HTML entities
    g_wordBucket = g_wordBucket.replace(/&(\w+);/ig, '');

    // Remove single numbers (not meaningful to us...)
    g_wordBucket = g_wordBucket.replace(/\s([0-9]+)\s/ig, '');

    // Remove Hyperlinks
    g_wordBucket = g_wordBucket.replace(urlRegEx, '');

    // Remove non-alphanumeric characters
    g_wordBucket = g_wordBucket.replace(/\W/ig, ' ');

    // Use Glossary to crawl and index the word bucket.
    var words = glossary.extract(g_wordBucket.toLowerCase());

    // Sort the words output from Glossary
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
});

app.get("/getActiveSearchTerms", function(req, res){
    res.end(JSON.stringify(g_activeSearchTerms));
});

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
app.listen(3000);