/*

    Slack 2 Daemon - a bidirectional slack bot for controlling server resources
    from slack.

    The MIT License (MIT)

    Copyright (c) 2015 Seth A. Hamilton

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

*/


var http = require('http');
var querystring = require('querystring');
var request = require('request');

var childProcess = require('child_process');

// Slack "Incoming WebHooks" URL provided when adding the slack "Incoming WebHooks" Integration
// we use this to send status or completion messagess for a long running jobs.
// If you don't have long running jobs this is optional, as this slack webhook endpoint
// can reply back to the channel at the time the webhook is triggered.
var slackURL = '<incoming web hook URL>';

if ( process.argv.length != 3 ) {

    console.log( '' );
    console.log( 'Slack 2 Daemon requires needs a ip an port to listen on' );
    console.log( '   <myip>:<myport> <botname>' );
    console.log( '' );
    process.exit( 1 );
}

var myAddress = process.argv[2].split( ':' )[0]; ;
var myPort = process.argv[2].split( ':' )[1];
var botName = process.argv[3];
var botHandle = '@' + botName + ': ';

function slack( message ) {

    request( {
        method: 'POST',
        'content-type' : 'application/json',
        url: slackURL,
        body: JSON.stringify( message ),
        encoding: 'utf8'
    },
    function (error, response, body) {

    } );

}

// little wrapper for span, which allows you to run linux programs 
// and get a callback once they've completed.
//
// Obviously you want to control what is sent to this, and you
// should not provide any chat handlers to run user provided linux
// commands.
//
//   command - the application to run (i.e. node)
//   options - array of command line parameters
//   done_cb - callback called when the application completes.
//             callback has one param done_cb( err )
//             err is null if no error, true if error
//
//   Running a node app:
//
//   Exec( 'node', [ '/myappdir/mynodeapp', 'param1', 'param2'])

function Exec( command, options, done_cb ) {

    p = childProcess.spawn( command, options );

    p.stdout.on('data', function (data) {
        process.stdout.write(data.toString() );
    });

    p.stderr.on('data', function (data) {
        process.stdout.write('ps stderr: ' + data.toString() );
    });

    p.on('close', function (code) {

        setImmediate( function () { done_cb( (code > 0) ? null : true ); } );

    });

}

// Handler for a call to this web hook
// tries to parse the message which in the case of slack
// comes as post, but contains essentially the querystring section of an
// URL (wish this was JSON, but this works). We use the nodejes querystring
// module to parse it, and stick it in a try catch just incase something
// didn't go right.
function Dispatch( req, res, data ) {

    try {

        data = querystring.parse(data);

    } catch (e) {

        res.writeHead( 200 );
        res.end( JSON.stringify( { text: "I had an issue." } ) );
        return;

    }

    console.log( JSON.stringify( data, null, 4 ) );
    console.log( '' );

    ParseMessage( data, function ( reply ) {

        res.writeHead( 200 );
        res.end( JSON.stringify( reply ) );

    });

}

// Slack names are lowercase, when personalizing and replying to the user
// it's friendlier to change "joe" to "Joe" for example.
//
// I found this on stackoverflow posted by Greg Dean, it's short and clean
// http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
//
function toTitleCase(str)
{
    return str.replace(
        /\w\S*/g,
        function(txt){
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}


// AddHelp - stick your help in here. 
//
// I used slacks attachment formatting here to indent and add a little
// color to the help menu. You could use the fields version of an
// attachment also if you wanted to show the command sand describe them with
// a one liner.
//
// reply - the reply block, we ammend this block by adding the attachments
//         portion, a reply block only need a "text" field to display something
//
// It's pretty fun, you can include images and links and all sorts of things
//
//         https://api.slack.com/docs/attachments
//
function AddHelp( reply ) {

    reply.attachments = [
        {
            color: '#cc0000',
            pretext: 'Try one of these: ',
            text:
                botHandle + "hello\r\n" +
                botHandle + "status\r\n" +
                botHandle + "do something <job>\r\n" +
                botHandle + "fix <job>\r\n" +
                botHandle + "help\r\n"

        }
    ]

}

// GenericNote- similar to the help function, but allows you to add
// an indented and colored line of text under the standard
// text header.
//
// note  - some text to show under the 'text' in the reply
// color - optional, defaults to green.
//         Must be provided in standard #RRGGBB (6 char) format,
//         slack also has three builtin colors:
//             good = green
//             warning = yellow/schoolbus orange
//             danger = red
//
//
function GenericNote( reply, note, color ) {

    reply.attachments = [
        {
            color: color || 'good',
            text: note
        }
    ]

}

// GetStatus - placeholder for a status function
//
// You may want your bot to report system status.
// this is useful for a support team for example that may need to know
// whether all services are working as expected to help debut thier issues.
//
// the commented example is a rough converts of redis hash of
// perhaps service names and their status (0 = good?) and turns
// them into an attachment with fields.
//
//       https://api.slack.com/docs/attachments
//
// fields are nice because they make a little table of sorts
//
// of course, I don't know what you use to monitor/heartbeat your apps
// perhaps you have a webhook hooked up to airbrake and you want this
// to simply return the last 10 errors that occured? Or you've
// added a few lines of code to your services that record a last checkin
// time in a redis hash (a useful 6 lines of code!)
//
function GetStatus( reply, done_cb ) {

    // comment this one out if you implement something here
    GenericNote( reply, 'things are good.');
    done_cb();

/*
    // replace this with something smart!
    // the code shows roughly how to build out a slack
    // attachment with fields, which can be visually pleasing.
    //
    // The scenario here is returning up/down status for
    // a bunch of servers. In this example the all server statuses
    // are all stored in a redis hash key which is populated
    // by a fictional daemon that watches these sorts of things.
    //
    redis.hgetall( 'some::redis::hashkey', function( err, data ) {

        var item = { fields: [] };

        for (var i in data) {

            var record = JSON.parse( data[i] );

            item.fields.push( {
                title: record.name,
                value: (record.value != 0) ? 'down' : 'up'
            });

        }

        reply.attachments = [ item ];

        done_cb();

    });
*/

}

// ParseMessage - This handles the message from the end user!
//
// You will want to parse your commands here, and make this
// as smart as you like.
//
// I've kept this pretty simple, because I don't know your
// use case.
//
// But it assumes we will get a message something like this:
//
// @bigbrother: <word> <word> <word> <...>
//
// we lowercase the message for simple text comparison
// then we split the message into an array of words
// then we shift off the first one which will be the bot name
// so array index 0 will likely be the command.
// array index 1 .. n will be parameters.
//
//

function ParseMessage( message, done_cb ) {

    // take the sender name and make the case "Friendly" so we can
    // personalize replies (good idea if more than one person is using the bot)
    var from = toTitleCase( message.user_name );

    var text = message.text.toLowerCase(); // easier to search

    var parts = text.split(' '); // all the words in the text
    parts.shift(); // pop the name of the bot off the list, we don't need it

    // set up the default reply, if we watch anything below we will replace this.
    var reply = { text: "I'm not sure what you mean, you can ask me for 'help' if you like." };

    if (text.indexOf( 'help' ) >= 0) { // anywhere in text
        reply.text = from + ', I can help with lots of things!';
        AddHelp( reply ); // add help text
    }
    else if (parts[0] == 'hello' || parts[0] == 'hi') { // anywhere in text

        // say hello... tell them how to get help

        reply.text =
            'Hello ' + from + ', what can I do for you today?\r\n' +
            'For help just say:\r\n' +
            botHandle + 'help';

    }
    else if (parts[0] == 'status') { // anywhere in text

        reply.text = from + ', here is the system status:';

        // add the status
        GetStatus( reply, function() {
            done_cb( reply  );
        });

        // break out because we will call the callback from within getstatus callback
        return;

    }
    else if (parts[0] == 'fix' && parts[1] && parts[1].length) {

        reply.text = from + ", I'm fixing it...";

/*

        // The following spawns a program and returns a message after it's done.
        // of course, configure it to run a program you would like to run

        Exec( 'node', [ '/code/fixing-app', parts[1] ], function () {

            slack( {
                attachments: [{
                    text: from + ", the fix is complete for " + parts[1] + ".",
                    color: 'good',
                }]
             } );

        });

*/
    }
    else if (parts[0] == 'do' && parts[1] == 'something') {

        reply.text = from + ", I'm issuing a 'do something' job.";

/*

        // The following spawns a program and returns a message after it's done.
        // of course, configure it to run a program you would like to run

        Exec( 'node', [ '/code/something-app', 'pause' ], function () {

            slack( {
                attachments: [{
                    text: from + ', something has been done!'
                    color: 'good',
                }]
             } );

        });

*/
    }

    done_cb( reply );

}


function StartServer() {

    http.createServer(function (req, res) {

        var data = [];

        req.on('data', function (chunk) { data.push(chunk); });
        req.on('end', function () {
            Dispatch(req, res, data.join('') );
        });

    }).listen(myPort, myAddress);

    console.log('+ Slack 2 Daemon hook server answering on ' + myAddress + ':' + myPort);
};

StartServer();

