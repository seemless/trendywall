var Flickr = require('flickr').Flickr;
var flickrConf = require("../conf/flickrConf");
var flickrKey = flickrConf.getConf()['consumer_key'];
var flickrSecret = flickrConf.getConf()['consumer_sercret'];
var flickr = new Flickr(flickrKey, flickrSecret);

var FlickrHandler = function () {
    var request = function (queryWords, tagMode, callback) {
        //Only valid tag_modes are 'any' or 'all', default to 'any'
        if(tagMode !== "all" || tagMode !== "any") {
          console.log("INFO: Flickr TagMode Defaulted to 'ANY'.");
          tagMode = "any";
        }

        if(queryWords[0] === '' || !queryWords){
          console.log("INFO: No Keywords Passed to Flickr. No API Call Made.");
          callback('<p>No Images Loaded</p>');
          return;
        }

        flickr.executeAPIRequest("flickr.photos.search", {
          tags: queryWords,
          tag_mode: tagMode,
          safe_search: 1
        }, /* Use Credentials: */ true, function (err, reply, cb) {
          var outHTML = '';

          if(err) console.error("ERROR: Flickr API Error -> " + err);
          else {
            
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
                outHTML += imgTagBeg + src + imgTagEndOne;
              } else {
                outHTML += imgTagBeg + src + imgTagEngOther;
              }
            }
            if(!outHTML) {
              outHTML = "<p>No photos were found matching your query.</p>";
            }
          }

          // Finish by calling the calback.
          callback(outHTML);
        });
      };

    return {
      request: request
    };
  };

module.exports = FlickrHandler;