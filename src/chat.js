// Connect to PeerJS, have server assign an ID instead of providing one
// Showing off some of the configs available with PeerJS :).
function findGetParameter(parameterName) {
    let result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

// let connMap = {
//     '1': ['2', '3'],
//     '2': ['1', '4', '5'],
//     '3': ['1', '4'],
//     '4': ['2', '3', '6', '7'],
//     '5': ['2', '6'],
//     '6': ['2', '4', '5', '9', '10', '11'],
//     '7': ['4', '8'],
//     '8': ['7', '12'],
//     '9': ['6', '12'],
//     '10': ['6'],
//     '11': ['6'],
//     '12': ['8', '9'],
// };
let connMap = {
    '1': ['2', '3'],
    '2': ['1', '4', '5'],
    '3': ['1', '4'],
    '4': ['2', '3', '6'],
    '5': ['2', '6'],
    '6': ['2', '4', '5'],
};

let selectedNumber = Math.ceil(Math.random() * 10000),
    min = selectedNumber;
let peer = new Peer(findGetParameter('id'), {
    // Set API key for cloud server (you don't need this if you're running your
    // own.
    key: '4aqoyi1xufp0t3xr',

    // Set highest debug level (log everything!).
    debug: 3,

    // Set a logging function:
    logFunction: function () {
        let copy = Array.prototype.slice.call(arguments).join(' ');
        $('.log').append(copy + '<br>');
    }
});
let connectedPeers = {};

// Show this peer's ID.
peer.on('open', function (id) {
    $('#pid').text(id);
    $('#number').text(selectedNumber);
    $('#minNumber').text(min);
});

// Await connections from others
peer.on('connection', connect);

peer.on('error', function (err) {
    console.log(err);
});


let answers = 0,
    parent = undefined,
    reqs = -1;

function findMin(pp) {
    if (!parent) {
        parent = pp;
        answers = 0;
        console.log('parent:', parent);
        reqs = Object.keys(peer.connections).length + (parent === -1 ? 0 : -1);
        console.log('waiting for responses:', reqs);

        if (reqs > 0) {
            Object.keys(peer.connections)
                .forEach((conn) => {
                    let [cc, $cc] = peer.connections[conn];
                    console.log('conn, parent, pp', conn, parent, pp);
                    if (conn != parent) {
                        cc.send('/calc_min');
                        $("#" + conn).find('.messages').append('<div><span class="you">You: </span>/calc_min</div>');
                    }
                })
        } else {
            trySendResponse(min);
        }
    } else {
        let msg = JSON.stringify({'min': min});
        peer.connections[pp][0].send(msg);
        $("#" + pp).find('.messages').append('<div><span class="you">You: </span>' + msg + '</div>');
    }
}

function trySendResponse(m) {
    answers += 1;
    console.log('answers received: ', answers, 'out of', reqs);

    if (m < min) {
        min = m;
        $('#minNumber').text(min);
    }

    if (answers >= reqs) {
        if (!!parent && parent !== -1) {
            console.log('parent answered: ', parent);
            let msg = JSON.stringify({'min': min});
            peer.connections[parent][0].send(msg);
            $("#" + parent).find('.messages').append('<div><span class="you">You: </span>' + msg + '</div>');
        }
        answers = 0;
        reqs = -1;
        parent = undefined;
    }
}

// Handle a connection object.
function connect(c) {
    // Handle a chat connection.
    if (c.label === 'chat') {
        let chatbox = $('<div></div>').addClass('connection').addClass('active').attr('id', c.peer);
        let header = $('<h1></h1>').html('Chat with <strong>' + c.peer + '</strong>');
        let messages = $('<div><em>Peer connected.</em></div>').addClass('messages');
        chatbox.append(header);
        chatbox.append(messages);

        $('#connections').append(chatbox);

        // Select connection handler.
        chatbox.on('click', function () {
            if ($(this).attr('class').indexOf('active') === -1) {
                $(this).addClass('active');
            } else {
                $(this).removeClass('active');
            }
        });

        c.on('data', function (data) {
            console.log(data);

            messages.append('<div><span class="peer">' + c.peer + '</span>: ' + data + '</div>');

            try {
                let d = JSON.parse(data);
                if (d.hasOwnProperty('min')) {
                    trySendResponse(d['min']);
                }
            } catch (e) {console.log(e);}

            if (data === '/calc_min') {
                findMin(c.peer);
            }

        });

        c.on('close', function () {
            alert(c.peer + ' has left the chat.');
            chatbox.remove();
            if ($('.connection').length === 0) {
                $('.filler').show();
            }
            delete connectedPeers[c.peer];
        });

    } else if (c.label === 'file') {
        c.on('data', function (data) {
            // If we're getting a file, create a URL for it.
            if (data.constructor === ArrayBuffer) {
                let dataView = new Uint8Array(data);
                let dataBlob = new Blob([dataView]);
                let url = window.URL.createObjectURL(dataBlob);
                $('#' + c.peer).find('.messages').append('<div><span class="file">' +
                    c.peer + ' has sent you a <a target="_blank" href="' + url + '">file</a>.</span></div>');
            }
        });
    }
    connectedPeers[c.peer] = 1;
}

$(document).ready(function () {
    // Prepare file drop box.
    let box = $('#box');
    box.on('dragenter', doNothing);
    box.on('dragover', doNothing);
    box.on('drop', function (e) {
        e.originalEvent.preventDefault();
        let file = e.originalEvent.dataTransfer.files[0];
        eachActiveConnection(function (c, $c) {
            if (c.label === 'file') {
                c.send(file);
                $c.find('.messages').append('<div><span class="file">You sent a file.</span></div>');
            }
        });
    });
    function doNothing(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function getConnection(requestedPeer) {
        if (!connectedPeers[requestedPeer]) {
            // Create 2 connections, one labelled chat and another labelled file.
            let c = peer.connect(requestedPeer, {
                label: 'chat',
                serialization: 'none',
                metadata: {message: 'hi i want to chat with you!'}
            });
            c.on('open', function () {
                connect(c);
            });
            c.on('error', function (err) {
                alert(err);
            });

            let f = peer.connect(requestedPeer, {label: 'file', reliable: true});
            f.on('open', function () {
                connect(f);
            });
            f.on('error', function (err) {
                alert(err);
            });
        }
        connectedPeers[requestedPeer] = 1;
    }

    // Connect to a peer
    $('#connect').click(function () {
        let requestedPeer = $('#rid').val();
        getConnection(requestedPeer);
    });

    // Close a connection.
    $('#close').click(function () {
        eachActiveConnection(function (c) {
            c.close();
        });
    });

    $('#calcMin').click(function(e) {
        e.preventDefault();
        let msg = '/calc_min';
        let fn = function (c, $c) {
            if (c.label === 'chat') {
                c.send(msg);
                if (!parent) {
                    parent = -1;
                }
                $c.find('.messages').append('<div><span class="you">You: </span>' + msg + '</div>');
            }
        };
        eachActiveConnection(fn)
    });

    // Send a chat message to all active connections.
    $('#send').submit(function (e) {
        e.preventDefault();
        // For each active connection, send the message.
        let $text = $("#text");
        let msg = $text.val();
        let fn = function (c, $c) {
            if (c.label === 'chat') {
                c.send(msg);
                $c.find('.messages').append('<div><span class="you">You: </span>' + msg + '</div>');
            }
        };
        eachActiveConnection(fn);
        $text.val('');
        $text.focus();
    });

    // Goes through each active peer and calls FN on its connections.
    function eachActiveConnection(fn) {
        let actives = $('.active');
        let checkedIds = {};
        actives.each(function () {
            let peerId = $(this).attr('id');

            if (!checkedIds[peerId]) {
                let conns = peer.connections[peerId];
                for (let i = 0, ii = conns.length; i < ii; i += 1) {
                    let conn = conns[i];
                    fn(conn, $(this));
                }
            }

            checkedIds[peerId] = 1;
        });
    }

    setTimeout(function() {
        connMap[peer.id].filter(cn => +cn > +peer.id).forEach(cn => getConnection(cn))
    }, 4000 + ~~(Math.random() * 2000));
});

// Make sure things clean up properly.

window.onunload = window.onbeforeunload = function (e) {
    if (!!peer && !peer.destroyed) {
        peer.destroy();
    }
};

