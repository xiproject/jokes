var xal = require('../../xal-javascript');
var _ = require('lodash');
var request = require('request');
var fs = require('fs');

var data;

try {
    data = require('./data.json');
} catch (e) {
    data = {
        jokes: []
    };
}

var tellAJoke = function() {

    xal.createEvent('xi.event.output.text', function(state, done) {
        state.put('xi.event.output.text', 'Okay.');
        done(state);
    });

    var options = {
        url: 'http://api.reddit.com/r/jokes/top?limit=1',
        headers: {
            'User-Agent': 'xi:jokes:v0.0.0 (xiproject.github.io)'
        }
    };

    if (data.after) {
        options.url += '&after=' + data.after;
    }

    var continuation;

    request(options, function(err, res, body) {
        if (err) {
            xal.log.error(err);
            return;
        }
        body = JSON.parse(body);
        xal.log.debug({body: body});
        xal.createEvent('xi.event.output.text', function(state, done) {
            state.put('xi.event.output.text', body.data.children[0].data.title);
            done(state);
        });
        continuation = body.data.children[0].data.selftext;
        data.after = body.data.after;
        data.jokes.push(body.data.children[0].data);
        fs.writeFile('data.json', JSON.stringify(data), function(err) {
            if (err) {
                xal.log.error(err);
            }
        });

    });

    return function continueJoke() {
        if (continuation) {
            xal.createEvent('xi.event.output.text', function(state, done) {
                state.put('xi.event.output.text', continuation);
                done(state);
            });
        }
        return false;
    };
};

var continueJoke = false;

xal.on('xi.event.input.text', function(state, next) {
    var text = _.reduce(state.get('xi.event.input.text'), function(memo, value) {
        if (memo.certainty > value.certainty) {
            memo = value;
        }
        return memo;
    });

    if (text.value.match(/tell.*?joke/i)) {
        continueJoke = tellAJoke();
    } else if (text.value.match(/(ok|why|how|when|where|which|who|what|tell|then|don't know)/i) &&
               continueJoke !== false) {
        continueJoke = continueJoke();
    } else {
        continueJoke = false;
    }
});

xal.start({name: 'Joke'}, function() {

});
