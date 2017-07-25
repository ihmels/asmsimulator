app.filter('range', function() {
    return function(input, start, end) {
        start = +start; //parse to int
        end = +end;
        return input.slice(start, end);
    };
});
