//establishes connection to server
let clickCount = 0;
let myState;
let sessionID;
let myGroup;
let socket = io.connect();
let quizCompleted = false
socket.on("connect", function () {
  sessionID = socket.id;
});
socket.emit("guestEnter");
$("#submit_quiz").on("click", () => {
  const choices = { choice1: $("#choice1").val(), choice2: $("#choice2").val(), choice3: $("#choice3").val(), inPerson: false, id: sessionID };
  console.log("choices: ", choices);
  $("#quiz").hide();
  //$("#main").removeClass("hidden");
  socket.emit("quizCompleted", choices);
  quizCompleted = true
});

$("#submit_group").on("click", () => {
  const group = $("#group").val()
  console.log('submitting group', group)
  socket.emit("updateState", {updateType: "joinGroup", group: group, member: sessionID})
  $("#group-select").hide();
  quizCompleted = true
  $("#messages").removeClass("hidden");
})
$("#pleasure").on("click", () => {
  console.log('adding pleasure')
   socket.emit("updateState", {updateType: "pleasure", target: myGroup.name, val: 1})
  $("#pleasure").prop("disabled", true)
  $("#pleasure").css("background-color", "gray")
})
$("#displeasure").on("click", () => {
   socket.emit("updateState", {updateType: "displeasure", target: myGroup.name, val: 1})
})
$("#submit_prompt").on("click", function () {
  console.log("sending prompt");
  $("#submit_prompt").prop("disabled", true)
  $("#button_status").text("You must wait to send more messages")
  let timer = setTimeout(resetButton, 20000)
  function resetButton() {
    $("#submit_prompt").prop("disabled", false)
    $("#button_status").text("You may send orders to your followers now.")
  }
  let msg = $("#new_prompt").val();
  $("#new_prompt").val("")
  socket.emit("updateState", { updateType: "newPrompt", prompt: msg, target: myGroup.name });
  //$("select").empty();
  //$("#main").addClass("hidden");
});

// socket.on("skullMove", function(data){
//     console.log("skullmove")
//   let left  = parseInt($('#skull').css("margin-left").split("px")[0]);
//   console.log(left)
//   $('#skull').css('margin-left', left + 10 + "px")
// })

// get state from servers
socket.on("updateState", function (state) {
  console.log("updating state: ", state);
  // update prompt if new prompt coming in
  myState = state;
  myGroup = getGroup(myState);
    console.log("my group: ", myGroup);
  if (myGroup != undefined) {
    console.log('group undefined')
    $("#sorting-wait").addClass("hidden")
  $("#main").removeClass("hidden");
  $("select").empty();
  $("#currentMessage").text(myGroup.currentPrompt.prompt);
    $("#group-text").removeClass("hidden")
    $("#group-text").html(`You are in the <span style="color:${myGroup.name}">${myGroup.name} council</span>, known for their ${myGroup.descriptor}`)
  if (myGroup.previousPrompts.length > 0) {
    console.log("previous prompt adding");
    $("#prevPrompt").empty();
    const counts = {};
    for (let prompt of myGroup.previousPrompts) {
      $("#prevPrompt").append(`<div>${prompt.prompt}</div>`);
      $('#prevPrompt').scrollTop($('#prevPrompt')[0].scrollHeight);
    }

   } 
    if (myGroup.nudge != "") {
      console.log("nudge: ", myGroup.nudge);
      $("#nudge").text(myGroup.nudge.prompt.toUpperCase());
    }
    if (state.voting) {
    $("#main").addClass("hidden")
    $("#voting-stage").removeClass("hidden")
  }
  } else if (!state.gameStart && myGroup == undefined && quizCompleted) {
    $("#sorting-wait").removeClass("hidden")
  } else if (state.gameStart) {
    $("#quiz").addClass("hidden")
    $("#group-select").removeClass("hidden")
  } else {
    $("#quiz").removeClass("hidden")
  }

  // GET OBJECTS FROM STATE, DRAW ONES THAT AREN'T ALREADY DRAWN]
});

function getGroup(state) {
  let groups = Object.values(state.groups);
  console.log("sessionID: ", sessionID);
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
