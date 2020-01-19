var inherits = require('util').inherits;
var http = require('http');
var net = require('net');
var client = new net.Socket();
var sleep = require('sleep');

var Service, Characteristic, ChannelCharacteristic;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  // we can only do this after we receive the homebridge API object
  //makeVolumeCharacteristic();
  makeChannelCharacteristic();

  homebridge.registerAccessory("homebridge-mediabox-xl", "mediabox-xl", MediaboxXL);
}

function MediaboxXL(log, config) {
  this.log = log;
  this.name = config.name;
  this.HOST = config.ip;

  this.service = new Service.Switch(this.name);

  this.service
    .getCharacteristic(Characteristic.On)
    .on("set", this.setOn.bind(this))
    .on("get", this.getOn.bind(this));

  this.service
    .addCharacteristic(ChannelCharacteristic)
    .on('get', this.getChannel.bind(this))
    .on('set', this.setChannel.bind(this));
}

MediaboxXL.prototype.getServices = function() {
  return [this.service];
}

MediaboxXL.prototype.getOn = function(callback) {

  var self = this;
  self.getOnCallback = callback;


  this.getPowerState(this.HOST, function(state) {
    self.getOnCallback(null,state == 1);
  });
}

MediaboxXL.prototype.setOn = function(on, callback) {

  var self = this;
  self.setOnCallback = callback;

  this.getPowerState(this.HOST, function(state) {

    if (state == -1 &&on) {
  	  self.sendKey(["E000"]);
      self.setOnCallback(null, true);
    }
    else if (state == 0 && on) {
      self.setOnCallback(new Error("The TV is *really* off and cannot be woken up."));
    }
    else if (state == 1 && !on) {
  	  self.sendKey(["E000"]);
      self.setOnCallback(null, false);
    }
    else {
     self.setOnCallback(new Error("Cannot fullfill " + (on ? "ON" : "OFF") + " request. Powerstate == " + state));
    }
  })
}


MediaboxXL.prototype.getChannel = function(callback) {
  callback(null, 0);
}

MediaboxXL.prototype.setChannel = function(channel, callback) {
	channel = channel.toString();
	keys = [];

	for (var i = 0 ; i < channel.length; i++) {
	  keys.push("E3" + channel[i]);
	}

	self.sendKey(keys);
	callback();
}


MediaboxXML.prototype.sendKey = function(keys) {
	state = 0;

	client.connect(62137, this.HOST, function() {
		console.log('Connected');

		client.on('data', function(data) {

			console.log("RECV " + Bin2Hex(data));

			switch (state)
			{
				case 0: // receive version
					client.write(data);
					state++;
					break;
				case 1:
					client.write(Hex2Bin("01"));
					state++;
					break;
				case 2:
					if (data.length > 24)
					{
						keys.forEach(function (key) {
							client.write(Hex2Bin("040100000000" + key));
							sleep.sleep(400);
							client.write(Hex2Bin("040000000000" + key));
							sleep.sleep(400);
						});

						client.close();

						state++;
					}			
					break;
				case 3:
					return true;
					break;
			}
		});

	});
}

//Useful Functions
function checkBin(n){return/^[01]{1,64}$/.test(n)}
function checkDec(n){return/^[0-9]{1,64}$/.test(n)}
function checkHex(n){return/^[0-9A-Fa-f]{1,64}$/.test(n)}
function pad(s,z){s=""+s;return s.length<z?pad("0"+s,z):s}
function unpad(s){s=""+s;return s.replace(/^0+/,'')}

//Decimal operations
function Dec2Bin(n){if(!checkDec(n)||n<0)return 0;return n.toString(2)}
function Dec2Hex(n){if(!checkDec(n)||n<0)return 0;return n.toString(16)}

//Binary Operations
function Bin2Dec(n){if(!checkBin(n))return 0;return parseInt(n,2).toString(10)}
function Bin2Hex(n){if(!checkBin(n))return 0;return parseInt(n,2).toString(16)}

//Hexadecimal Operations
function Hex2Bin(n){if(!checkHex(n))return 0;return parseInt(n,16).toString(2)}
function Hex2Dec(n){if(!checkHex(n))return 0;return parseInt(n,16).toString(10)}

// Returns:
// -1 when the TV is in standby-mode (a 400-Bad Request is returned by the TV)
//  0 when the TV is off, or it's a TV that does not support the standby wake-up request(the request errors)
//  1 when the TV is on (a normal 200 response is returned)
MediaboxXL.prototype.getPowerState = function(ipAddress, stateCallback) {

  var path = "/DeviceDescription.xml";
  var body = '';

  var post_options = {
    host: ipAddress,
    port: '8080',
    path: path,
    method: 'GET',
  }

  // The request intermittently TIMES OUT, ERRORS, OR BOTH(!) when the TV is not
  // available. Therefore we're maintaining state whether the callback is called
  // since you're only allowed to call the Homekit-callback once.
  var calledBack = false;

  var req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(data) {
      // do nothing here, but without attaching a 'data' event, the 'end' event is not called
    });
    res.on('end', function() {
      if(res.statusCode == 200) {
        if (!calledBack) {
          stateCallback(1);
        }
      }
      else {
        if (!calledBack) {
          stateCallback(-1);
        }
      }
    });
  });

 req.on('error', function(e) {
    console.log('errored');
    console.log(e);
    if (!calledBack) {
      stateCallback(0);
      calledBack = true;
    }
    else {
      console.log ("already called callback");
    }
  });
  req.on('timeout', function() {
    console.log('timed out');
    if (!calledBack) {
      stateCallback(0);
      calledBack = true;
    }
    else {
      console.log ("already called callback");
    }
  });

  req.setTimeout(1000);

  req.write(body);
  req.end();
}


function makeChannelCharacteristic() {

  ChannelCharacteristic = function () {
    Characteristic.call(this, 'Channel', '212131F4-2E14-4FF4-AE13-C97C3232499D');
    this.setProps({
      format: Characteristic.Formats.INT,
      unit: Characteristic.Units.NONE,
      maxValue: 100,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };

  inherits(ChannelCharacteristic, Characteristic);
}