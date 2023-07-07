var express = require("express");
var app = express();
var server = app.listen(process.env.PORT || 3000);
app.use(express.static("public"));
console.log("server running");
var socket = require("socket.io");
var io = socket(server);

io.sockets.on("connection", newConnection);

//pseudocode map

// server: track object location, group membership, individual prompts and voting for groups
// client: get current group, post objects (and voting options) to server
// secret: send prompts to all groups, should be able to remove individual submissions if dey bad or something
// secret can advance to next stage once submissions are in
// real-time client location ???
// how to progress through stages????

let state = {
  gameStart: false,
  groups: {
    red: {
      name: "red",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: "",
      descriptor: "bravery.",
      pleasure: 0,
      displeasure: 0
    },
    green: {
      name: "green",
      members: [],
      currentPrompt: { prompt: "?" },
      previousPrompts: [],
      nudge: "",
      descriptor: "opportunism.",
      pleasure: 0,
      displeasure: 0
    },
    blue: {
      name: "blue",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: "",
      descriptor: "kindness.",
      pleasure: 0,
      displeasure: 0
    },
    yellow: {
      name: "yellow",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: "",
      descriptor: "resourcefulness.",
      pleasure: 0,
      displeasure: 0
    },
  },
};
function newConnection(socket) {
  console.log("socket.id: ", socket.id);
  socket.on("quizCompleted", sortingHat);
  socket.on("guestEnter", function(data) {
   io.emit("updateState", state)
  })
  //io.emit("updateState", state)
  socket.on("updateState", function (data) {
    // Object.assign(state, data)
    // if data includes new prompt/option, add that to group
    // if data includes new object, add it to object list
    console.log("updating state: ", data);
    // types:
    // newObject (from in-person/client.js)
    // newPrompt (from remote/ghost.js)
    // nudgeFromTheGods (from mod/secret.js)
    switch (data.updateType) {
      case "newObject":
        state.objects.push(data.object);
        break;
      case "newPrompt":
        for (group of Object.values(state.groups)) {
          if (group.name == data.target) {
            group.previousPrompts.push(group.currentPrompt);
            group.currentPrompt = { prompt: data.prompt };
          }
        }
        break;
      case "gameStart":
        state.gameStart = true
        break;
      case "gameEnd":
        state.gameStart = false
        break;
      case "voting":
        state.voting = true
        break;
      case "pleasure":
        console
        state.groups[data.target].pleasure += data.val
        break;
      case "displeasure":
        state.groups[data.target].displeasure += data.val
        break;
      case "joinGroup":
        console.log('joining group: ', data)
        state.groups[data.group].members.push(data.member)
        io.emit("sendGuestList", state.groups);
        break;
      case "nudgeFromTheGods":
        for (group of Object.values(state.groups)) {
          if (data.target == "all") {
            group.nudge = { prompt: data.prompt };
          } else {
            if (group.name == data.target) {
              group.nudge = { prompt: data.prompt };
            }
          }
        }
        break;
      default:
        console.log("Attempting update with incorrect update type");
    }
    console.log("state updating");
    io.emit("updateState", state);
  });

  socket.on("disconnect", removeDisconnected);
  function removeDisconnected() {
    console.log("should be removing: ", socket.id);
    for (group of Object.values(state.groups)) {
      console.log("group: ", group);
      if (group.members.includes(socket.id)) {
        console.log("includes socket: ", socket.id);
        const idx = group.members.indexOf(socket.id);
        state.groups[group.name].members.splice(idx, 1);
      }
    }
    io.emit("updateState", state);
  }
}
function sortingHat(choices) {
  // add members to different groups
  // not really doing anything with todd's code here but leaving it if it's useful
  // updateGuestList();
  // console.log("choices: ", choices);
  // TODO: ACTUAL SORTING LOGIC INSTEAD OF THIS
  if (choices.choice1 == "1") {
    state.groups.red.members.push(choices.id);
  } else if (choices.choice2 == "2") {
    state.groups.blue.members.push(choices.id);
  } else if (choices.choice3 == "3") {
    state.groups.yellow.members.push(choices.id);
  } else {
    state.groups.green.members.push(choices.id);
  }

  io.emit("sendGuestList", state.groups);

  //socket.on("guestEnter", function (data) {
  //  socket.join("guests");
  //});
  // send state to client
  io.emit("updateState", state);

  // this stuff should be adapted to allow i/o from client/"performer"
  //  socket.on("sendStatus", function (data) {
  //    io.emit("statusMsg", choices.id + " " + data);
  //  });
  //
  //  socket.on("clientAction", function (data) {
  //    io.emit(data.type, data);
  //  });
  //
  //  // host actions should be sent to group
  //  // a potential refactor back to using host/client instead of a catchall updateState *could* be a good idea but
  //  // for now updateState seems simpler
  //  socket.on("hostAction", function (data) {
  //    // this is actually a clever little thing but i'm not sure how it would work unless i were using rooms better
  //    //if (data.target && data.type) {
  //    //  io.to(data.target).emit(data.type, data);
  //    //} else {
  //    //  io.emit(data.type, data);
  //    //}
  //  });
  //
}
function updateGuestList(socket) {
  // still not sure if i'm gonna do anything with guestlist, but leaving it here just in case
  getSocketsInRoom("guests").then((guests) => {
    console.log(guests);
    io.emit("sendGuestList", guests);
  });
}

// on socket disconnect, remove from group list
// TODO figure out 'soft fail' condition for disconnect
// ideally, getting position from AR stuff or marker, can reassign to group automatically on reconnect
// although I guess it's kinda funny to just make people run to a new group if they disconnect

async function getSocketsInRoom(room) {
  let returnArray = [];
  const sockets = await io.in(room).fetchSockets();
  for (let i = 0; i < sockets.length; i++) {
    returnArray.push(sockets[i].id);
  }
  return returnArray;
}
