// TRENDYWALL
// 
// To run TrendyWall, run this file in NodeJS.

// Connect to https://nodetime.com for profiling
// require("nodetime").profile();

// === Server Setup ===
// Use the Express Framework to serve our application.
var MOD_express = require("express");
var g_app = MOD_express();

// === Configuration ===
// Declare Constants
var NUM_WORDS_IN_CLOUD = 50;

// Views
g_app.configure(function () {
    g_app.set('views', __dirname + '/views');
    g_app.set('view engine', 'jade');
});

// Statics (simply serve flat files from this directory)
g_app.use("/static", MOD_express.static(__dirname + '/static'));

// Database Setup
var g_db = require("./handlers/dbHandler.js")("db");

// Twitter Setup
var g_twitter = require("./handlers/twitterHandler.js")(g_db.keywordsModel);


// == "Pages", or paths to respond to. ==
g_app.all('/twitterStream', function (req, res) {
    g_twitter.startStreamFromTwitter();
    g_twitter.startStreamToClient(req, res);
});

g_app.all("/getGeoTweet", function (req, res) {
    g_twitter.getGeoTweet(req, res);
});

g_app.all("/", function(req, res){
    res.redirect("/trendywall");
});

g_app.all("/trendywall", function (req, res) {
    res.render("trendywall.ejs", {
        layout: false
    });
});

var MOD_flickr = require("./handlers/flickrHandler.js")();

// FLICKR STREAM
// Requires Parameters:
//    tagMode - 'any' or 'all'
//    keywords - comma-delimited list
g_app.get("/flickr", function (req, res) {
    var tagMode = req.param('tagMode');
    var queryWords = unescape(req.param('keywords')).split(',');
    MOD_flickr.request(queryWords, tagMode, function(result){
        res.end(result);
    });
});

// Word Cloud Word Generation
var g_wordcloudOnTimeout = false;
var g_wordcloudWords = null;
g_app.get("/getWordcloudWords", function (req, res) {
    if(!g_wordcloudOnTimeout){
        g_db.keywordsModel.getHighestCountWords(function (words) {
            g_wordcloudWords = words;
            res.end(JSON.stringify(g_wordcloudWords));
        });
        g_wordcloudOnTimeout = true;
        setTimeout(function(){
            g_wordcloudOnTimeout = false;
        }, 60 * 1000);
    } else {
        console.log("INFO: Wordcloud Words Not Regenerated (on Timeout).");
        res.end(JSON.stringify(g_wordcloudWords));
    }
});

g_app.get("/getActiveKeywords", function (req, res) {
    g_db.keywordsModel.getActiveKeywords(function(words){
        res.end(JSON.stringify(words));
    });
});

g_app.get("/activateKeywords", function (req, res){
    var s = req.param('keywords');
    if(s){
        var keywords = s.split(',');
        g_db.keywordsModel.activateKeywords(keywords, g_twitter.startStreamFromTwitter);
    } 
    res.end();
});

g_app.get("/deactivateKeywords", function(req, res){
    var s = req.param('keywords');
    if(s){
        var keywords = s.split(',');
        g_db.keywordsModel.deactivateKeywords(keywords, g_twitter.startStreamFromTwitter);
    } 
    res.end();
});

// Start Server "Listening"
g_app.listen(3000);
g_app.listen(80);