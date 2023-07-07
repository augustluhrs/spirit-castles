let socket = io();
socket.emit("guestEnter");

socket.on("sendGuestList", function (data) {
  //map runs a function on each item in a list
  $("#groups").empty();
  console.log(data);
  Object.values(data).map(function (group) {
    $("#groups").append(`<option value=${group.name} members='' count='' currentPrompt='' currentResults='' pastVotes=''>${group.name}</option>`);
  });
  $("option").click(function () {
    $("#members").text($("option:selected").attr("members"));
    $("#memberCount").text($("option:selected").attr("count"));
    $("#currentPrompt").text($("option:selected").attr("currentPrompt"));
    $("#currentResults").text($("option:selected").attr("currentResults"));
  });
});

//socket.on('statusMsg', function(msg){
//  let socketID = msg.split(" ")[0]
//  $('#messages').prepend(`<p socket=${socketID}>${msg}</p>`)
//  let performedActions = $(`option:contains(${socketID})`).attr("actionsPerformed") ? $(`option:contains(${socketID})`).attr("actionsPerformed") : ""
//    $(`option:contains(${socketID})`).attr("actionsPerformed", performedActions + msg.split(socketID)[1]+ ", ")
//  $('#messages p').click(function(){
//    $('#guests').val($(this).attr("socket"))
//  })
//})
socket.on("updateState", function (state) {
  for (let group of Object.values(state.groups)) {
    let opt = $(`option:contains(${group.name})`);
    opt.attr("members", group.members);
    opt.attr("count", group.members.length);
    opt.attr("currentPrompt", group.currentPrompt.prompt);
    $("#currentPrompt").text(group.currentPrompt.prompt);
    for (let prompt of group.previousPrompts) {
      $("#pastVotes").append(`<div>${prompt.prompt}</div>`);
    }
  }

  $("#state").text(JSON.stringify(state));
});

$("#gameHasStarted").click(function() {
  sendSocket("updateState", true, {updateType: "gameStart"})
})
$("#endGame").click(function() {
  sendSocket("updateState", true, {updateType: "gameEnd"})
})

$("#startVoting").click(function() {
  sendSocket("updateState", true, {updateType:"voting"})
})

$("#sendToAll").click(function () {
  sendSocket("updateState", true, { updateType: "nudgeFromTheGods", prompt: $("#newPrompt").val() });
  $("#guests").val("");
});

$("#sendToSelected").click(function () {
  sendSocket("updateState", false, { updateType: "nudgeFromTheGods", prompt: $("#newPrompt").val() });
});

// button clicks:
// Update group(s):
// voting is complete, move currentPrompt to pastVotes, show result to client
// Send to group(s):
// Send new prompt to group

// TODO: send socket for show control, moving to next stage in queue, etc.

function sendSocket(eventName, targetAll = false, data = {}) {
  //looks to see if a user id has been selected
  //is this being sent to a single user?
  if ($("option:selected")[0] && targetAll == false) {
    data.target = $("option:selected")[0].value;
    //  let pastActions = $("option:selected").attr("actionsSent") ? $("option:selected").attr("actionsSent") : "";
    // $("option:selected").attr("actionsSent", pastActions + " " + eventName);
  }
  if (targetAll) {
    data.target = "all";
  }
  console.log("sending socket: ", data);
  // data.type = eventName;
  socket.emit(eventName, data);
}
