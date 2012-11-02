// Generate DEBUG output.
var DEBUG = false;

// Connect to https://nodetime.com for profiling
//require("nodetime").profile();

// Use the Express Framework to serve our application.
var MOD_express = require("express");
var g_app = MOD_express();

var NUM_WORDS_IN_CLOUD = 50;

// Database Setup
var g_db = require("./handlers/dbHandler.js")("db");

var g_twitter = require("./handlers/twitterHandler.js")(g_db.keywordsModel);

// Setup
g_app.configure(function () {
    g_app.set('views', __dirname + '/views');
    g_app.set('view engine', 'jade');
});


// Serve static files
g_app.use("/static", MOD_express.static(__dirname + '/static'));

// TODO: Do better than this...
g_app.get("/googleTopWorldNews", function (req, res) {
    res.end();
});

g_app.all('/twitterStream', function (req, res) {
    g_twitter.startStreamFromTwitter();
    g_twitter.startStreamToClient(req, res);
});

g_app.all("/getGeoTweet", function (req, res) {
    g_twitter.getGeoTweet(req, res);
});

g_app.get("/news", function (req, res) {
    res.end();
});

g_app.get("/trendywall", function (req, res) {
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

g_app.get("/test", function (req, res) {
    res.end();
});

//process.env.PORT is a cloud9 thing. Use your own port (ex 9999) if on a normal platform.
g_app.listen(3000);