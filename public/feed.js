let socket = io.connect();
let myState;
console.log('feed')

socket.on("newMessage", function (message) {
  console.log('adding message: ', message)
  $("#feed").prepend(`<div style="color:${message.group};">${message.message}</div>`)
  $('#feed').scrollTop(0);

});

socket.on("voteTally", function (data) {
  console.log('hit vote tally')
  //change the feed to vote tally
  document.querySelector("#feed").style.display = "none";
  document.querySelector("#votes").style.display = "flex";
});

socket.on("updateState", function (state) {
  if (state.voting == true) {
    console.log('updating votes')
    document.querySelector("#feed").style.display = "none";
    document.querySelector("#votes").style.display = "flex";
  }
  myState = state
})

socket.on("showVote", function(data) {
  $("#explainer").hide()
  console.log('showing vote: ', data)
  let group = myState.groups[data.group]
  $(`#${group.name}`).removeClass('hidden')
  $(`#${group.name}`).empty()
  $(`#${group.name}`).append(`<div style="color:${group.name}">${group.name}</div>`)
  setTimeout(() => {
      $(`#${group.name}`).append(`<div style="color:${group.name}"> Pleasure: ${group.pleasure}</div>`)
  }, 2000);
  setTimeout(() => {
      $(`#${group.name}`).append(`<div style="color:${group.name}"> Displeasure: ${group.displeasure}</div>`)
  }, 4000);
})