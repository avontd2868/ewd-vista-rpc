/*

 ----------------------------------------------------------------------------
 | ewd-vista-rpc.js:                                                        |
 |  EWD.js Interface for VistA: RPC Wrapper                                 |
 |                                                                          |
 | Copyright (c) 2016 M/Gateway Developments Ltd,                           |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  26 January 2016

*/

function runRPC(params, session, ewd) {

  console.log('vista-rpc.runRPC: ' + JSON.stringify(params));

  var data;

  // Default context and division can only be over-ridden via Session values under 'VistA' property

  var context = session.$('VistA').$('context')._value;
  if (!context || context === '') {
    if (params.rpcName == "DDR LISTER" || params.rpcName == "DDR GETS ENTRY DATA") {
      context = "DVBA CAPRI GUI";
    } 
    else {
      context = "OR CPRS GUI CHART";
    }
  }
  var division = session.$('VistA').$('division')._value;
  if (!division || division === '') division = 500;
     // MUST SET THIS EQUAL TO STATION ID!!! ORDER WRITING FAILS WITHOUT IT


  var tmpGlo = new ewd.mumps.GlobalNode('TMP', []);
  tmpGlo.$('XQCS').$(process.pid)._delete();
	
  var gloRef = tmpGlo.$(process.pid);
  // **** essential - must clear down the temporary global first:
  gloRef._delete();

  var ok;
  if (params.rpcName === 'XUS SIGNON SETUP') {
    data = {
      name : params.rpcName
    };
    ok = ewd.util.clearSymbolTable(ewd);
  }
  else {
    data = {
      name : params.rpcName,
      division: division,
      context: context,
      input: params.rpcArgs || []
    };
    ok = ewd.util.restoreSymbolTable(ewd, session);
  }
  gloRef._setDocument(data, true, 1);
  console.log('**** data = ' + JSON.stringify(data));

  var id = '';
  var documentName = '%zewdSession';
  if (session && session.sessid) {
    id = session.sessid;
  }

  var status = ewd.mumps.function("RPCEXECUTE^ewdjsVistARPC", '^TMP(' + process.pid + ')', id, documentName) ;
  // Save the VistA symbol table
  ok = ewd.util.saveSymbolTable(ewd, session);
  // clean up the back-end Cache/GT.M process:
  ok = ewd.util.clearSymbolTable(ewd);

  console.log('***** status = ' + status);
  //console.log(gloRef._getDocument());
  if (!status) return {
    error: 'Routine crashed'
  };
  if (status === 'ERROR') {
    var execResult = gloRef.$('RPCEXECUTE').$('result')._value;
    var pieces = execResult.split('^');
    return {
      error: pieces[1]
    };
  }
  else {
    var resultsNode = gloRef.$('result');
    var results = resultsNode._getDocument();

    if (!params.hasOwnProperty("deleteGlobal") || params.deleteGlobal) { // if we didn't set flag or if it's set true
      gloRef._delete();
    }

    if (params.format === 'raw') {
      return results;
    }
    else {
      if (results.type === 'SINGLE VALUE') {
        if (results.value && results.value.indexOf('^') !== -1) {
          var arr = results.value.split('^');
          results.value = arr;
        }
      }
      return results;
    }

  }
};

function ewdLogin(params, ewd) {
  if (ewd.session.isAuthenticated) {
    return {error: 'User is already logged in'}
  }
  var accessCode = params.accessCode;
  if (!accessCode || accessCode === '') {
    return {error: 'Missing Access Code'};
  }
  var verifyCode = params.verifyCode;
  if (!verifyCode || verifyCode === '') {
    return {error: 'Missing Verify Code'};
  }

  var args = {
    rpcName: 'XUS SIGNON SETUP'
  };
  var session = ewd.session;
  var response = runRPC(args, session, ewd);
  // need to check response for error ***
  
  args = {
    rpcName: 'XUS AV CODE',
    rpcArgs: [{
      type: 'LITERAL',
      value: accessCode + ';' + verifyCode
    }],
  };
  var results = runRPC(args, session, ewd);
  var values = results.value;
  var duz = values[0];
  var error = values[3]
  if (duz === '0' && error !== '') {
    return {error: error}
  }
  else {
    // logged in successfully
    ewd.session.setAuthenticated();
    var greeting = values[7];
    var pieces = greeting.split(' ');
    pieces = pieces.splice(2, pieces.length);
    var displayName = pieces.join(' ');
    return {
      displayName: displayName,
      greeting: greeting,
      lastSignon: values[8],
      messages: values.splice(8, values.length)
    };
  }
}

function ewdService(params, ewd) {
  if (params.rpcName === 'XUS SIGNON SETUP' || params.rpcName === 'XUS AV CODE') {
    return {error: params.rpcName + ' cannot be run this way.  Use login function instead'};
  }
  if (!ewd.session.isAuthenticated) {
    return {error: 'User has not logged in'}
  }
  return runRPC(params, ewd.session, ewd);
}


module.exports = {
  run: runRPC,
  onMessage: {
    login: ewdLogin,
    runRPC: ewdService
  }
};
