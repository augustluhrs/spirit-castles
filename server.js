var express = require("express");
var app = express();
var server = app.listen(process.env.PORT || 3000);
app.use(express.static("public"));
console.log("server running");
var socket = require("socket.io");
var io = socket(server);

io.sockets.on("connection", newConnection);


// FOR NEXT TIME (BRENT)
// generally would like to see how this plays out with more time/space
// 1. generate names for followers "Binky the Fearful"/spirit emperors "Crumbo the Wise"
// -------- could be fun to do micro-dwarf fortress style assigned attributes (although honestly one-two adjectives gives people plenty to work with)
// 2. better camera position or bigger space to better delineate followers (or just jerseys or something)
// 3. sound/visual cue for great cataclysm
// 4. different possible outcomes for each group - (final outcome felt a bit disconnected from voting)
// -------- if we have fountain, could have separate taps for each group, and
// -------- if the bowl/cup for that group overflows, their spirit emperors return
// -------- or: blow a bubble for each group and the bubble has to be bigger/smaller based on how much displeasure they have
// 5. (goes with 4) - UI output for diff outcomes, screen says "you have been sacrificed" or "the spirit emperors have returned"
// 6. Notifications for new messages/commands, sounds/animations etc.
// 7. probably need a clearer idea of what "punishment" means, although i think some of this would
// -------- be solved with more time (if one group has stockpiled a resource, punishment is taking it from them)

let state = {
  gameStart: false,
  groups: {
    red: {
      name: "red",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: { prompt: "your followers must demonstrate their daring" },
      descriptor: "bravery.",
      pleasure: 0,
      displeasure: 0
    },
    green: {
      name: "green",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: { prompt: "your followers must prepare for conflict" },
      descriptor: "cunning.",
      pleasure: 0,
      displeasure: 0
    },
    blue: {
      name: "blue",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: { prompt: "your followers must gather gifts for other castles" },
      descriptor: "kindness.",
      pleasure: 0,
      displeasure: 0
    },
    yellow: {
      name: "yellow",
      members: [],
      currentPrompt: { prompt: "" },
      previousPrompts: [],
      nudge: { prompt: "your followers must gather resources" },
      descriptor: "resourcefulness.",
      pleasure: 0,
      displeasure: 0
    },
  },
  sortingHat: {
    hasBeenSorted: false, //after secret "createsGroups", new quiz results will auto sort and not wait
    followersAwaiting: 0, //to update secret so we know when there's a quorum
    ghostsAwaiting: 0,
    unsortedFollowers: [], //each new quiz submission pushes to these with id and score
    unsortedGhosts: [],
  }
};
// deep copy of initial state for reset
const defaultState = JSON.parse(JSON.stringify(state))


function newConnection(socket) {
  console.log("new connection from socket.id: ", socket.id);
  socket.on("quizCompleted", sortingHat);
  socket.on("guestEnter", function(data) {
    // just attaching an empty updateState
    // for condition where game has already started and they reload
   io.emit("updateState", state)
    io.emit("sendGuestList", state.groups)
  })
  socket.on("showVote", function(data) {
    io.emit("showVote", data)
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
        console.log('sending new message')
        io.emit("newMessage", {group: data.target, message: data.prompt})
        for (let group of Object.values(state.groups)) {
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
        console.log('game should be ending')
        state.gameStart = false;
        Object.assign(state, defaultState)
      //  state = defaultState;
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
        if (data.group !== null){ //ran into weird bug where ghost could click submit with no group selected, crashed server
          state.groups[data.group].members.push(data.member)
          io.emit("sendGuestList", state.groups);
        }
        break;
      case "nudgeFromTheGods":
        for (let group of Object.values(state.groups)) {
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
  
  socket.on("createGroups", createGroups);

  socket.on("disconnect", removeDisconnected);
  function removeDisconnected() {
    console.log("should be removing: ", socket.id);
    if (state.sortingHat.hasBeenSorted){
      for (let group of Object.values(state.groups)) {
        console.log("group: ", group);
        if (group.members.includes(socket.id)) {
          console.log("includes socket: ", socket.id);
          const idx = group.members.indexOf(socket.id);
          state.groups[group.name].members.splice(idx, 1);
        }
      }
    } else {
      //make sure still removing if they leave before we've sorted groups
      for (let result of state.sortingHat.unsortedFollowers) {
        if (result.id == socket.id){
          console.log("includes pre-sorted follower: ", socket.id);
          const idx = state.sortingHat.unsortedFollowers.indexOf(result);
          state.sortingHat.unsortedFollowers.splice(idx, 1);
        }
        
      }
      for (let result of state.sortingHat.unsortedGhosts) {
        if (result.id == socket.id){
          console.log("includes pre-sorted ghost: ", socket.id);
          const idx = state.sortingHat.unsortedGhosts.indexOf(result);
          state.sortingHat.unsortedGhosts.splice(idx, 1);
        }
      }
    }
    
    io.emit("updateState", state);
  }
}
function sortingHat(choices) {
  // add members to different groups

  //
  // going to have each client's submit add to a sortable object that
  // will then get sorted and pushed when we have a quorum of people done
  // God will push a "create Groups" button and anyone who finishes after that
  // will just go to their group (not going to worry about evenness beyond first sort)
  // createGroups() will update state and emit 
  //
  // NOTE: shouldn't it be 3-12? they can get a 3 if they select all "1" options. didn't actually do the math just wanna make sure here - Brent
  // adding scores on spectrum from 4-12 where 4-6: cunning, 7-8: resourcefulness, 9-10: bravery, 11-12: kindness
  let score = 0;
  score = parseInt(choices.choice1, 10) + parseInt(choices.choice2, 10) + parseInt(choices.choice3, 10);
  console.log(choices.id + " score: " + score);
  
  if (!state.sortingHat.hasBeenSorted){
    //check to see if follower or ghost
    if (choices.inPerson){
      //add to array to be sorted on createGroups()
      state.sortingHat.unsortedFollowers.push({id: choices.id, score: score});
      state.sortingHat.followersAwaiting++;
    } else {
      state.sortingHat.unsortedGhosts.push({id: choices.id, score: score});
      state.sortingHat.ghostsAwaiting++;
    }
  } else {
    // auto sort with no regard to evenness
    if (score < 7){
      state.groups.green.members.push(choices.id);
    } else if (score < 9) {
      state.groups.yellow.members.push(choices.id);
    } else if (score < 11) {
      state.groups.red.members.push(choices.id);
    } else {
      state.groups.blue.members.push(choices.id);
    } 
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

function createGroups(){
  //sort the quiz results by score and then evenly split into the 4 colors
  let unsortedFollowers = state.sortingHat.unsortedFollowers;
  let unsortedGhosts = state.sortingHat.unsortedGhosts;
  
  // console.log("before sort");
  // console.log(unsorted);
  unsortedFollowers.sort((a,b)=>{return a.score - b.score});
  unsortedGhosts.sort((a,b)=>{return a.score - b.score});
  // console.log("after sort");
  // console.log(unsorted);
  
  //section off the array into four roughly even sections, spreading followers and ghosts evenly
  let numGroup = { //just for logging/debugging
    green: 0,
    yellow: 0,
    red: 0,
    blue: 0
  }
  let sectionFollowers = unsortedFollowers.length/4;
  for (let i = 0; i < unsortedFollowers.length; i++){
    if (i < sectionFollowers){
      state.groups.green.members.push(unsortedFollowers[i].id);
      numGroup.green++;
    } else if (i < sectionFollowers * 2){
      state.groups.yellow.members.push(unsortedFollowers[i].id);
      numGroup.yellow++;
    } else if (i < sectionFollowers * 3){
      state.groups.red.members.push(unsortedFollowers[i].id);
      numGroup.red++;
    } else {
      state.groups.blue.members.push(unsortedFollowers[i].id);
      numGroup.blue++;
    }
  }
  let sectionGhosts = unsortedGhosts.length/4;
  for (let i = 0; i < unsortedGhosts.length; i++){
    if (i < sectionGhosts){
      state.groups.green.members.push(unsortedGhosts[i].id);
      numGroup.green++;
    } else if (i < sectionGhosts * 2){
      state.groups.yellow.members.push(unsortedGhosts[i].id);
      numGroup.yellow++;
    } else if (i < sectionGhosts * 3){
      state.groups.red.members.push(unsortedGhosts[i].id);
      numGroup.red++;
    } else {
      state.groups.blue.members.push(unsortedGhosts[i].id);
      numGroup.blue++;
    }
  }
  
  //just checking
  console.log("sections");
  console.log(numGroup);
  
  state.sortingHat.unsortedFollowers = []; //just to clear up the state log for secret page
  state.sortingHat.unsortedGhosts = [];
  state.sortingHat.hasBeenSorted = true;
  //update all clients
  io.emit("updateState", state);
}

function updateGuestList(socket) {
  // currently just being used for control panel to get list of groups from the server
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
