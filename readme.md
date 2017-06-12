## WebRTC (PeerJS) чат

PeerJS Chat example updated to work as distributed minimum calculcator

#### Tests

To run test:

Make sure that static files are served from current folder (nginx settings included).

```
./run_test.sh
```

Test opens N tabs (http://localhost/?id=K , sets peer id) in preferred browser with xdg-open command.
After 6 seconds all connections should be established (according to `connMap` from chat.js).

To calc minimum press "Calc Min" button in the browser interface.


#### Known bugs

Somehow after connection is established there appears 2 chatboxes for one connection.
