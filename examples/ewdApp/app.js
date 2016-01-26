EWD.application = {
  name: 'RPCBrokerTest',
};

EWD.sockets.log = true;

//Access Code: r0b-tweed
//verify Code: secret-1

EWD.onSocketsReady = function() {
  $('#loginBtn').click(function(e) {
    var username = $('#username').val();
    if (username === '') {
      alert('You must enter an Access Code!');
      return;
    }
    var password = $('#password').val();
    if (password === '') {
      alert('You must enter a Verify Code!');
      return;
    }
    EWD.sockets.sendMessage({
      type: 'login',
      params: {
        accessCode: username,
        verifyCode: password
      },
      done: function(messageObj) {
        if (messageObj.message.error) {
          alert(messageObj.message.error);
        }
        else {
          $('#welcome').text(messageObj.message.greeting);
          $('#login-form').hide();
          $('#homescreen').show();
        }
      }
    });
  });
  $('#rpcBtn').click(function(e) {
    EWD.sockets.sendMessage({
      type: 'rpcTest',
      done: function(messageObj) {
        if (messageObj.message.error) {
          alert(messageObj.message.error);
        }
        else {
          console.log(JSON.stringify(messageObj));
        }
      }
    });
  });

  $('#rpcBtn2').click(function(e) {
    EWD.sockets.sendMessage({
      type: 'runRPC',
      params: {
        rpcName: 'XWB EGCHO STRING',
        rpcArgs: [{
          type: 'LITERAL',
          value: 'This is a test!'
        }],
      },
      service: 'ewd-vista-rpc',
      done: function(messageObj) {
        if (messageObj.message.error) {
          alert(messageObj.message.error);
        }
        else {
          console.log(JSON.stringify(messageObj));
        }
      }
    });
  });

};
