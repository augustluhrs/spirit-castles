let socket = io.connect();
let myState;

socket.on("newMessage", function (message) {
  console.log('adding message: ', message)
  $("#feed").append(`<div style="color:${message.group};">${message.message}</div>`)
  $('#feed').scrollTop($('#feed')[0].scrollHeight);

});
