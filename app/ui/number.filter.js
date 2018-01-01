app.filter('number', function() {
    return function(input, isHex, width) {
        if (isHex) {
            var hex = input.toString(16).toUpperCase();
            var diff = width - hex.length;
            
            if (!width | width < 0 || diff < 0)
                return hex;
                
            while (diff > 0) {
                hex = '0' + hex;
                diff--;
            }
            
            return hex;
        } else {
            return input.toString(10);
        }
    };
});
