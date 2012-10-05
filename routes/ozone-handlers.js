var OzoneHandlers = function() {
    var firstService= function(queryParam) {
        var html = "<html><body>"+queryParam+"</body></html>"; 
        return html;
    }

    return {
        firstService: firstService,
       
    }
}();

module.exports = OzoneHandlers;