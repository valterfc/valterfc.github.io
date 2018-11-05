var topicDsBrd = 'ValterFC/IoT/Home/VfcAquaControl/MQTT/Dashboard';
var topicCmd   = 'ValterFC/IoT/Home/VfcAquaControl/MQTT/Commands';
//var mqttURL = 'ws://iot.eclipse.org/ws';
var mqttURL = 'ws://192.168.0.190/mqtt';
var recebendo = false; //impedir q seja enviado novamente um comando enquanto está recebendo um status do mesmo - exemplo on/off luz

//Connect Options
var options = {
  timeout: 3,
  //Gets Called if the connection has sucessfully been established
  onSuccess: mqtt_OnConnect,
  //Gets Called if the connection could not be established
  onFailure: mqtt_OnFailure,
  mqttVersion: 4,
  timeout: 60
};

/*
if('caches' in window) {
  caches.open('vfcaquacontrol-v1').then(function(cache) { 
    cache.addAll(['/'])
      .then(function() { 
        // Cached!
      });
  });
}
*/

// message command format:
// {"cmd": "", "value": ""}
var jsonMsg = {
  cmd: null,
  value: null
};

$( document ).ready(function() {
  //$("#editsubscribe").val('teste');

  mqtt_Connect(); //ativar para conectar automaticamente


  $('#a1_luz').change(function() {
    $('#a1_luz').val($(this).is(':checked'));
  });

  $('#a2_luz').change(function() {
    $('#a2_luz').val($(this).is(':checked'));
  });


  $('#a1_luz').click(function() {
    if (recebendo) return true; //para não processar o click quando está recebendo a mensagem

    if (!$(this).is(':checked')) {
      //return confirm("Are you sure?");
      var msg = jsonMsg;
      msg.cmd = 'a1-luz-on';
      msg.value = 'false';

      mqtt_Publish_Cmd(msg)
    } else {
      //return confirm("Are you sure?");
      var msg = jsonMsg;
      msg.cmd = 'a1-luz-on';
      msg.value = 'true';

      mqtt_Publish_Cmd(msg)
    }

    return true;
  });  

  $('#a2_luz').click(function() {
    if (recebendo) return true; //para não processar o click quando está recebendo a mensagem

    if (!$(this).is(':checked')) {
      //return confirm("Are you sure?");
      var msg = jsonMsg;
      msg.cmd = 'a2-luz-on';
      msg.value = 'false';

      mqtt_Publish_Cmd(msg)
    } else {
      //return confirm("Are you sure?");
      var msg = jsonMsg;
      msg.cmd = 'a2-luz-on';
      msg.value = 'true';

      mqtt_Publish_Cmd(msg)
    }

    return true;
  });  
});


//Using the HiveMQ public Broker, with a random client Id
//var client = new Paho.MQTT.Client("iot.eclipse.org", 80, "myclientid_" + parseInt(Math.random() * 100, 10));
var client = new Paho.MQTT.Client(mqttURL, 'myclientid_' + parseInt(Math.random() * 100, 10));

//Gets  called if the websocket/mqtt connection gets disconnected for any reason
client.onConnectionLost = function (responseObject) {
  //Depending on your scenario you could implement a reconnect logic here
  mqtt_All_PrintMsg('connection lost: ' + responseObject.errorMessage);
};

client._disconnected = () => {
  mqtt_All_PrintMsg('disconnected');
};

//Gets called whenever you receive a message for your subscriptions
client.onMessageArrived = function (message) {
  recebendo = true; //para não processar o click quando está recebendo a mensagem

  try {
    //Do something with the push message you received
    //mqtt_A1_PrintMsg('Topic: ' + message.destinationName + '  | ' + message.payloadString);
    
    //convert to JSON object
    console.log('mqtt message received: ', message.payloadString);
    var obj = jsonMsg;
    obj = JSON.parse(message.payloadString);
    
    //console.log('objeto recebido: ');
    //console.log(obj);

    if (message.destinationName == topicDsBrd) {
      if (obj.cmd == 'a1-temp') {
        mqtt_A1_PrintTemp(obj.value);
      } else if (obj.cmd == 'a2-temp') {
        mqtt_A2_PrintTemp(obj.value);
      } else if (obj.cmd == 'a1-luz-on') {
        $( "#a1_luz").prop('checked', (obj.value == 'true'));
      } else if (obj.cmd == 'a2-luz-on') {
        $( "#a2_luz").prop('checked', (obj.value == 'true'));
      }

    //} else if (message.destinationName == topicDsBrd) {
    //  mqtt_A2_PrintTemp(message.payloadString);
    } else {
      console.log('tópico não encontrado: ' + message.destinationName)
    }
  }
  catch(err) {
    console.log("Error: " + err + ".");
  }
  finally {
    recebendo = false;
  }
};

//Creates a new Messaging.Message Object and sends it to the HiveMQ MQTT Broker
var publish = function (payload, topic, qos) {
  //Send your message (also possible to serialize it as JSON or protobuf or just use a string, no limitations)
  payload = JSON.stringify(payload); //convert message to JSON

  var message = new Paho.MQTT.Message(payload); //using String message
  message.destinationName = topic;
  message.qos = qos;
  client.send(message);
};

function mqtt_Reconnect() {
  //reconnect not working
  location.reload(false); //false - Default. Reloads the current page from the cache
}

function mqtt_Connect() {
  mqtt_All_PrintMsg('Conectando...');
  client.connect(options);
}

function mqtt_OnConnect() {
  mqtt_All_PrintMsg('Conectado');
  mqtt_Subscribe();
}

function mqtt_OnFailure(message) {
  mqtt_All_PrintMsg('Falha conexão: ' + message.errorMessage);
}

function mqtt_Subscribe() {
  client.subscribe(topicDsBrd,
    {
      qos: 2,
      onSuccess: callBack_OnSubscribe
    }
  );
}

function callBack_OnSubscribe(invocationContext, grantedQos) {
  mqtt_A1_PrintMsg('Pronto');
  mqtt_A2_PrintMsg('Pronto');

  setTimeout(function() {
    mqtt_Publish_InitialCmd();
  }, 500);
}

function mqtt_Publish_InitialCmd() {
  //request initial values
  var cmd = jsonMsg;
  cmd.cmd = "initvalues";
  cmd.value = "true";
  publish(cmd,topicCmd,2);
}

function mqtt_Publish_Cmd(cmd) {
  publish(cmd,topicCmd,2);
}

function mqtt_Disconnect() {
  try {
    client.disconnect();
  } catch (error) {
    //nothing
  }
}

function mqtt_All_PrintMsg(msg) {
  mqtt_A1_PrintMsg(msg);
  mqtt_A2_PrintMsg(msg);
}

// --------------------
// Aquarium 1
// --------------------
function mqtt_A1_PrintMsg(msg) {
  console.log(msg);
  $('#divlogs').prepend('<span>A1: ' + msg + '</span><br>');
  $("#a1_msg").val(msg);
}

function mqtt_A1_PrintTemp(msg) {
  console.log(msg);
  $('#divlogs').prepend('<span>A1: ' + msg + '</span><br>');
  $("#a1_temp").val(msg);
}

// --------------------
// Aquarium 2
// --------------------
function mqtt_A2_PrintMsg(msg) {
  console.log(msg);
  $('#divlogs').prepend('<span>A2: ' + msg + '</span><br>');
  $("#a2_msg").val(msg);
}

function mqtt_A2_PrintTemp(msg) {
  console.log(msg);
  $('#divlogs').prepend('<span>A2: ' + msg + '</span><br>');
  $("#a2_temp").val(msg);
}
