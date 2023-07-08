//establishes connection to server
let clickCount = 0;
let myState;
let sessionID;
let myGroup;
let socket = io.connect();
socket.on("connect", function () {
  sessionID = socket.id;
});

socket.emit("guestEnter");
$("#submit_quiz").on("click", () => {
  const choices = { choice1: $("#choice1").val(), choice2: $("#choice2").val(), choice3: $("#choice3").val(), inPerson: true, id: sessionID };
  console.log("choices: ", choices);
  $("#quiz").hide();
  $("#messages").removeClass("hidden");
  socket.emit("quizCompleted", choices);
});

$("#submit_group").on("click", () => {
  const group = $("#group").val()
  console.log('submitting group', group)
  $("#group-select").hide();
  $("#messages").removeClass("hidden");
  socket.emit("updateState", {updateType: "joinGroup", group: group, member: sessionID})

})

// get state from servers
socket.on("updateState", function (state) {
  console.log("updating state: ", state);
  // update prompt if new prompt coming in
  myState = state;
  myGroup = getGroup(myState);
  console.log("my group: ", myGroup);
  if (myGroup != undefined) {
    console.log('should show group text')
    $("#group-text").removeClass("hidden")
    $("#group-text").html(`You are in the <span style="color:${myGroup.name}">${myGroup.name} brigade</span>, known for ${myGroup.descriptor}`)
    $("#currentPrompt").text(myGroup.currentPrompt.prompt);
    let prevVote = myGroup.previousPrompts[myGroup.previousPrompts.length - 1];
    if (prevVote != undefined) {
    $("#prevPrompt").text(prevVote.prompt);
    }
  // GET OBJECTS FROM STATE, DRAW ONES THAT AREN'T ALREADY DRAWN]
  } else if (state.gameStart) {
    $("#group-select").removeClass("hidden")
  } else {
    $("#quiz").removeClass("hidden")
  }
});

function getGroup(state) {
  let groups = Object.values(state.groups);
  let filtered = groups.filter((group) => {
    return group.members.includes(sessionID);
  });
  return filtered[0];
}

// on prompt button submit
// updateState: send prompt to group in server, delay updateState until all group members have submitted

// when object placement window is shown
// updateState: send object position, type, group, label, and placer ID to server
//this allows us to play audio

//THREE STUFF
let threeXPos, threeYPos, threeZPos, threeType, threeColor;

// inside three
// lil-gui to select type/color
// drag and drop set X/Y/Z

$("#submit-three").click(function () {
  // get xyz values
  // get label
  console.log("submitting from client");
  let label = $("#three-object-label").val();
  socket.emit("updateState", {
    updateType: "newObject",
    object: {
      label: label,
      x: threeXPos,
      y: threeYPos,
      z: threeZPos,
      color: threeColor,
      type: threeType,
      creator: sessionID,
      group: myGroup,
    },
  });
});

// AUDIO STUFF IF NECESSARY
let ac;
$(document).click(function () {
  if (!ac) {
    ac = new AudioContext();
  }
});
