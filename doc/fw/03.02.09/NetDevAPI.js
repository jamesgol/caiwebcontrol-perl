var NUM_TTL_OUTPUTS = 8;
var NUM_TTL_INPUTS = 8;
var	NUM_OF_VARS	= 8;
var	NUM_OF_TEMPERATURE_SENSORS = 8;
var	NUM_OF_ANALOG_INPUTS = 8;
var	NUM_OF_HUMIDITY_SENSORS = 8;
var NUM_OF_EMAILS = 8;

/*********** CONFIGURATION CLASSES ***********************/

/* Temperautre sensor configuration class */
function TempSnsrCfg()
{
	this._romCodes = new Array();
	this._units = new Array();

	this._DATA_STRUCT_SIZE = 56;	 //size of NVM_TEMPSNR_CFG structure 
	
	
	/* inialise member vars */
	for(var i = 0; i<NUM_OF_TEMPERATURE_SENSORS; i++)
	{
		this._romCodes.push("000000000000");
		this._units.push("degrees");
	}
		
	
	
	this.setRomCode = function(romCode, idx)
	{
		if(idx < 1 || idx > NUM_OF_TEMPERATURE_SENSORS)
		{
			throw("Invalid temperature sensor index");
		}
		
		var regEx = /^[0-9A-Fa-f]{12,12}$/
		if(regEx.test(romCode) == false)
		{
			throw("Invalid ROM code string, must be 12 valid hex characters");
		}
		
		this._romCodes[idx-1] = romCode;	
	}
	
	this.getRomCode = function(idx)
	{
		if(idx > 0 && idx <= NUM_OF_TEMPERATURE_SENSORS)
		{
			return this._romCodes[idx-1];
		}
		
		throw("Invalid temperature sensor index");
	}
	
	this.setUnits = function(unitsStr, idx)
	{
		if(idx < 1 || idx > NUM_OF_TEMPERATURE_SENSORS)
		{
			throw("Invalid temperature sensor index");
		}
				
		if(unitsStr != "centigrade" && unitsStr != "fahrenheit")
		{
			throw("Invalid temperature sensor units, must be 'centigrade' or 'fahrenheit'");
		}
		
		this._units[idx-1] = unitsStr;			
	}
	
	this.getUnits = function(idx)
	{
		if(idx > 0 && idx <= NUM_OF_TEMPERATURE_SENSORS)
		{
			return this._units[idx-1];
		}
		
		throw("Invalid temperature sensor index");	
	}
	
	
	/*data is encoded into the following structure 
	struct
	{
		SNSR_ROM_CODE rom_code[8];	
		TEMPUNITS units[8];
	}NVM_TEMPSNR_CFG;
	
	where:
	TEMPUNITS = 0 for degrees and 1 for fahreneit
	SNSR_ROM_CODE is a 6 byte array  */
		
	this.encode = function()
	{
		var str = "";
		for(var i = 0; i<NUM_OF_TEMPERATURE_SENSORS; i++)
		{
			 //first encode rom code 
			str += this._romCodes[i];
		}
		
		for(var i = 0; i<NUM_OF_TEMPERATURE_SENSORS; i++)
		{		
			// units 
			var u = (this._units[i] == "centigrade") ? 0 : 1;
			str += Encoding.encodeByte(u);
		}
				
		return str;
	}
	
	this.decode = function(str)
	{
		if(str.length != (this._DATA_STRUCT_SIZE * 2) )
		{
			throw("Invalid string length for TempSnsrCfg data");
		}
		
		var idx = 0;
		for(var i = 0; i<NUM_OF_TEMPERATURE_SENSORS; i++)
		{
			// first decode rom code 
			this.setRomCode(str.substr(idx, 12), i+1);
			idx += 12;
		}
		
		
		for(var i = 0; i<NUM_OF_TEMPERATURE_SENSORS; i++)
		{	
			// units 
			var u = Encoding.decodeByte(str.substr(idx, 2));
			idx +=2;
			if(u == 0)
			{
				this.setUnits("centigrade", i+1);
			}
			else
			{
				this.setUnits("fahrenheit", i+1);
			}
		}
	}
}


/* IOMGR configuration class */
function IoCtrlCfg()
{
	this._plcEnabled = 1;
	this._x10_enabled = 0;
	this._browserCtrl = new Array();
	this._plcCtrl = new Array();
	this._invertOutput = new Array();
	this._invertInput = new Array();

	this._DATA_STRUCT_SIZE = 34;	 //size of NVM_IO_CTRL structure 
	
	
	/* initialise data vars to a default state */
	this._plcEnabled = 1;
	for(var i = 0; i<8; i++)
	{
		this._browserCtrl.push(1);
		this._plcCtrl.push(1);
		this._invertOutput.push(1);
		this._invertInput.push(1);
	}
	
	
	
	this.setPlcEnabled = function(b)
	{
		if(b == true)
		{
			this._plcEnabled = 1;
		}
		else
		{
			this._plcEnabled = 0;
		}
	}
	
	this.getPlcEnabled = function()
	{
		return (this._plcEnabled == 1) ? true : false;
	}
	
	this.enabledBrowserCtrl = function(idx, b)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		this._browserCtrl[idx-1] = (b == true) ? 1 : 0;
	}
	
	this.getBrowserCtrl = function(idx)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		return (this._browserCtrl[idx-1] == 1) ? true : false;
	}
	
	this.enabledPlcCtrl = function(idx, b)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		this._plcCtrl[idx-1] = (b == true) ? 1 : 0;
	}
	
	this.getPlcCtrl = function(idx)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		return (this._plcCtrl[idx-1] == 1) ? true : false;
	}
	
	
	this.invertOutput = function(idx, b)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		this._invertOutput[idx-1] = (b == true) ? 1 : 0;
	}
	
	this.getOutputInvert = function(idx)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl output index");
		}
		
		return (this._invertOutput[idx-1] == 1) ? true : false;
	}	
	
	
	this.invertInput = function(idx, b)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl input index");
		}
		
		this._invertInput[idx-1] = (b == true) ? 1 : 0;
	}
	
	this.getInputInvert = function(idx)
	{
		if( idx < 1 || idx > NUM_TTL_OUTPUTS)
		{
			throw("Invalid ttl input index");
		}
		
		return (this._invertInput[idx-1] == 1) ? true : false;
	}	
	
	this.setX10Enabled = function(e)
	{
		this._x10_enabled = e;
	}
	
	this.getX10Enabled = function()
	{
		return (this._x10_enabled == 1) ? true : false;
	}
	

	
	/*data is encoded into the following structure 
	struct
	{
		BOOL global_plc_enable;
		BOOL browser_ctrl[NUM_TTL_OUTPUTS];
		BOOL plc_ctrl[NUM_TTL_OUTPUTS];
		BOOL invert_output[NUM_TTL_OUTPUTS];
		BOOL invert_input[NUM_TTL_INPUTS];
		BOOL x10_enabled;
	}NVM_IO_CTRL; */	
		
	this.encode = function()
	{
		var str = "";
		
		str += Encoding.encodeByte(this._plcEnabled);
		
		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			str += Encoding.encodeByte(this._browserCtrl[i]);
		}

		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			str += Encoding.encodeByte(this._plcCtrl[i]);
		}
		
		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			str += Encoding.encodeByte(this._invertOutput[i]);
		}
		
		for(var i = 0; i<NUM_TTL_INPUTS; i++)
		{
			str += Encoding.encodeByte(this._invertInput[i]);
		}
		
		str += Encoding.encodeByte(this._x10_enabled);	
		
		return str;
	}
	
	this.decode = function(str)
	{
		if(str.length != (this._DATA_STRUCT_SIZE * 2) )
		{
			throw("Invalid string length for IoCtrlCfg data");
		}
		
		var idx = 0;
		
		this._plcEnabled = Encoding.decodeByte(str.substr(idx, 2));
		idx += 2;
		
		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			this._browserCtrl[i] = Encoding.decodeByte(str.substr(idx, 2));
			idx += 2;
		}

		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			this._plcCtrl[i] = Encoding.decodeByte(str.substr(idx, 2));
			idx += 2;
		}
		
		for(var i = 0; i<NUM_TTL_OUTPUTS; i++)
		{
			this._invertOutput[i] = Encoding.decodeByte(str.substr(idx, 2));
			idx += 2;
		}
		
		for(var i = 0; i<NUM_TTL_INPUTS; i++)
		{
			this._invertInput[i] = Encoding.decodeByte(str.substr(idx, 2));
			idx += 2;
		}
		
		this._x10_enabled = Encoding.decodeByte(str.substr(idx, 2));
		idx += 2;
	}
}


/* NETCFG configuration class */	
function NetworkCfg()
{
	this._ipAddr = "";
	this._mask = "";
	this._primaryDNS = "";
	this._secondaryDNS = "";
	this._gateway = "";
	this._hostName = "";
	this._dchpEnabled = true;
	this._password = "";
	this._username = "";
	this._webLoginEnabled = true;
	this._allowedIps = new Array();
	this._httpPort = 80;

	this._DATA_STRUCT_SIZE = 104;	 //size of NVM_APP_CONFIG structure 
	this._MAX_STRING_LENGTH = 16;	
	this._MAX_ALLOWED_IP_ADDRESSES = 8;
	
	
	/* initialise data vars to a default state */
	this._plcEnabled = 1;
	for(var i = 0; i<this._MAX_ALLOWED_IP_ADDRESSES; i++)
	{
		this._allowedIps.push("0.0.0.0");
	}
	
	
	this.setIpAddress = function(ipAddr)
	{
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._ipAddr = ipAddr;
	}
	
	this.getIpAddress = function()
	{
		return this._ipAddr;
	}

	this.setSubNetMask = function(ipAddr)
	{
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._mask = ipAddr;
	}
	
	this.getSubNetMask = function()
	{
		return this._mask;
	}
	
	this.setPrimaryDNS = function(ipAddr)
	{
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._primaryDNS = ipAddr;
	}
	
	this.getPrimaryDNS = function()
	{
		return this._primaryDNS;
	}
	
	this.setSecondayDNS = function(ipAddr)
	{
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._secondayDNS = ipAddr;
	}
	
	this.getSecondayDNS = function()
	{
		return this._secondayDNS;
	}
	
	this.setGateway = function(ipAddr)
	{
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._gateway = ipAddr;
	}
	
	this.getGateway = function()
	{
		return this._gateway;
	}
	
	this.setHostName = function(hostName)
	{
		hostName.trim();
		if(hostName.length > this._MAX_STRING_LENGTH)
		{
			throw("Invalid host name length");
		}
		
		this._hostName = hostName;
	}
	
	this.getHostName = function()
	{
		return this._hostName;
	}
	
	this.setUserName = function(userName)
	{
		userName.trim();
		if(userName.length > this._MAX_STRING_LENGTH)
		{
			throw("Invalid user name length");
		}
		
		this._username = userName;
	}
	
	this.getUserName = function()
	{
		return this._username;
	}
	
	this.setPassword = function(password)
	{
		password.trim();
		if(password.length > this._MAX_STRING_LENGTH)
		{
			throw("Invalid password length");
		}
		
		this._password = password;
	}
	
	this.getPassword = function()
	{
		return this._password;
	}
	
	this.enableDHCP = function(b)
	{
		this._dchpEnabled = b;
	}
	
	this.getDHCPEnabled = function(b)
	{
		return this._dchpEnabled;
	}
	
	this.enableWebLogin = function(b)
	{
		this._webLoginEnabled = b;
	}
	
	this.getWebLoginEnabled = function()
	{
		return this._webLoginEnabled;
	}
	
	this.setHttpPort = function(port)
	{
		if(port == NaN)
		{
			port.trim();
			port = parseInt(port);
		}
		this._httpPort = port;
	}
	
	this.getHttpPort = function()
	{
		return this._httpPort;
	}
	
	this.setAllowedIpAddress = function(idx, ipAddr)
	{
		if(idx < 1 || idx > this._MAX_ALLOWED_IP_ADDRESSES)
		{
			throw("Invalid allowed IP address index");
		}
		
		ipAddr.trim();
		if(Encoding.ipAddressValid(ipAddr) == false)
		{
			throw("Invalid ip address");
		}
		
		this._allowedIps[idx-1] = ipAddr;
	}
	
	this.getAllowedIpAddress = function(idx)
	{
		if(idx < 1 || idx > this._MAX_ALLOWED_IP_ADDRESSES)
		{
			throw("Invalid allowed IP address index");
		}
		
		return this._allowedIps[idx-1];
	}

	
	/*data is encoded into the following structure 
	struct
	{
		IP_ADDR		ip_addr;
		IP_ADDR		mask;
		IP_ADDR		primaryDNS;
		IP_ADDR		secondaryDNS;
		IP_ADDR		gateway;
		BYTE		host_name[16];
		BOOL 		dchp_enabled;
		BYTE password[MAX_STR_LEN];
		BYTE username[MAX_STR_LEN];
		BOOL web_login_enabled;
		IP_ADDR allowed_ips[MAX_LIMIT_IP_ADDRESSES];
		UINT16 http_port;
	}NVM_APP_CONFIG; */	
		
	this.encode = function()
	{
		var str = "";
		
		str += Encoding.encodeIpAddress(this._ipAddr);
		str += Encoding.encodeIpAddress(this._mask);
		str += Encoding.encodeIpAddress(this._primaryDNS);
		str += Encoding.encodeIpAddress(this._secondayDNS);
		str += Encoding.encodeIpAddress(this._gateway);
		
		str += Encoding.encodeString(this._hostName, this._MAX_STRING_LENGTH);
		str += Encoding.encodeBool(this._dchpEnabled);
		str += Encoding.encodeString(this._password, this._MAX_STRING_LENGTH);
		str += Encoding.encodeString(this._username, this._MAX_STRING_LENGTH);
		str += Encoding.encodeBool(this._webLoginEnabled);
		
		for(var i = 0; i<this._MAX_ALLOWED_IP_ADDRESSES; i++)
		{
			str += Encoding.encodeIpAddress(this._allowedIps[i]);
		}
		
		str += Encoding.encodeInt16(this._httpPort);
		
		return str;
	}
	
	this.decode = function(str)
	{
		if(str.length != (this._DATA_STRUCT_SIZE * 2) )
		{
			throw("Invalid string length for NetworkCfg data");
		}
		
		var idx = 0;
		
		this._ipAddr = Encoding.decodeIpAddress(str.substr(idx, 8));
		idx += 8;
		this._mask = Encoding.decodeIpAddress(str.substr(idx, 8));
		idx += 8;
		this._primaryDNS = Encoding.decodeIpAddress(str.substr(idx, 8));
		idx += 8;
		this._secondayDNS = Encoding.decodeIpAddress(str.substr(idx, 8));
		idx += 8;
		this._gateway = Encoding.decodeIpAddress(str.substr(idx, 8));
		idx += 8;
		
		this._hostName = Encoding.decodeString(str.substr(idx, this._MAX_STRING_LENGTH * 2));
		idx += this._MAX_STRING_LENGTH * 2;
		
		this._dchpEnabled = Encoding.decodeBool(str.substr(idx, 2));
		idx += 2;
		
		this._password = Encoding.decodeString(str.substr(idx, this._MAX_STRING_LENGTH * 2));
		idx += this._MAX_STRING_LENGTH * 2;
		
		this._username = Encoding.decodeString(str.substr(idx, this._MAX_STRING_LENGTH * 2));
		idx += this._MAX_STRING_LENGTH * 2;
		
		this._webLoginEnabled = Encoding.decodeBool(str.substr(idx, 2));
		idx += 2;
		
		for(var i = 0; i<this._MAX_ALLOWED_IP_ADDRESSES; i++)
		{
			this._allowedIps[i] = Encoding.decodeIpAddress(str.substr(idx, 8));
			idx += 8;
		}
		
		this._httpPort = Encoding.decodeInt16(str.substr(idx, 4));
		idx += 4;
		
	}
}


/* General board configuration class */
function GeneralCfg()
{
	this._clockAdjust = 0;
	this._ajaxPolling = true;

	this._DATA_STRUCT_SIZE = 6;	 //size of NVM_GENERAL_CONFIG structure 
	
	this.lookup = new Array();
	this.lookup["utc-12"] =  -43200;
	this.lookup["utc-11"] =  -39600;
	this.lookup["utc-10"] =  -36000;
	this.lookup["utc-9"] =  -32400;
	this.lookup["utc-8"] =  -28800;
	this.lookup["utc-7"] =  -25200;
	this.lookup["utc-6"] =  -21600;
	this.lookup["utc-5"] =  -18000;
	this.lookup["utc-4"] =  -14400;
	this.lookup["utc-3"] =  -10800;
	this.lookup["utc-2"] =  -7200;
	this.lookup["utc-1"] =  -3600;
	this.lookup["utc"] =  0;
	this.lookup["utc+1"] =  3600;
	this.lookup["utc+2"] =  7200;
	this.lookup["utc+3"] =  10800;
	this.lookup["utc+4"] =  14400;
	this.lookup["utc+5"] =  18000;
	this.lookup["utc+6"] =  21600;
	this.lookup["utc+7"] =  25200;
	this.lookup["utc+8"] =  28800;
	this.lookup["utc+9"] =  32400;
	this.lookup["utc+9.5"] =  34200;
	this.lookup["utc+10"] =  36000;
	this.lookup["utc+11"] =  39600;
	this.lookup["utc+12"] =  43200;
	
	this.setTimeZone = function(zone)
	{
		if(this.lookup[zone] == null)
		{
			throw("Invalid time zone: " + zone);
		}
		
		this._clockAdjust = this.lookup[zone];		
	}
	
	this.getTimeZone = function()
	{
		var ts = new String("");
		
		if(this.lookup["utc+9.5"] == this._clockAdjust)
		{
			ts = "utc+9.5";
		}
		else
		{
			for(var z=-12; z<=12; z++)
			{
				var key = "utc";
				if(z < 0)
				{
					key += z;
				}
				else if(z > 0)
				{
					key += "+" + z;
				}
				else
				{
					// nothing
				}

				if(this.lookup[key] == this._clockAdjust)
				{
					ts = key;
					break;
				}
			}
		}
		
		return ts;
	}
	
	this.setAjaxPolling = function(poll)
	{
		this._ajaxPolling = poll;
	}
	
	this.getAjaxPolling = function()
	{
		return this._ajaxPolling;
	}
	
	/*data is encoded into the following structure 
	struct
	{
		INT32 region_second_adj;
		BOOL ajax_polling;
		UINT8 pad;
	}NVM_GENERAL_CONFIG; */
			
	this.encode = function()
	{
		var str = "";
		
		str += Encoding.encodeInt32(this._clockAdjust);
		str += Encoding.encodeByte(this._ajaxPolling);
		str += Encoding.encodeByte(0);	// pad
		
		return str;
	}
	
	this.decode = function(str)
	{
		if(str.length != (this._DATA_STRUCT_SIZE * 2) )
		{
			throw("Invalid string length for GenCfg data");
		}
		
		var idx = 0;
		
		this._clockAdjust = Encoding.decodeInt32(str.substr(idx, 8));
		idx+=8;
		this._ajaxPolling = Encoding.decodeBool(str.substr(idx, 2));
		idx+=2;		
	}
}

/* Email configuration class */
function EmailCfg()
{
	this._MAX_MESSAGES = 8;
	this._MAX_CFG_STRING_LEN = 64;
	this._MAX_MSG_STRING_LEN = 256;
	
	this._DATA_STRUCT_SIZE = 2882;	 //size of NVM_EMAIL_CFG structure 
	
	
	this._msgBody = new Array();
	this._msgSubject = new Array();
	this._smtpPort = 25;
	this._server = "";
	this._to = "";
	this._from = "";
	this._username = "";
	this._password = "";	
	
	
	/* initalise message bodys and subjects */
	for(var i = 0; i<this._MAX_MESSAGES; i++)
	{
		this._msgBody.push("");
		this._msgSubject.push("");
	}
	
	
	this.setMsgBody = function(idx, msg)
	{
		if(idx < 1 || idx > this._MAX_MESSAGES)
		{
			throw("Invalid email message index!");
		}
		
		if(msg.length > this._MAX_MSG_STRING_LEN)
		{
			throw("Message body length to long!!");
		}
		
		this._msgBody[idx-1] = msg;
	}
	
	this.getMsgBody = function(idx)
	{
		if(idx < 1 || idx > this._MAX_MESSAGES)
		{
			throw("Invalid email message index!");
		}
		
		return this._msgBody[idx-1];
	}
	
	this.setMsgSubject = function(idx, subject)
	{
		if(idx < 1 || idx > this._MAX_MESSAGES)
		{
			throw("Invalid email message index!");
		}
		
		if(subject.length > this._MAX_CFG_STRING_LEN)
		{
			throw("Message subject length to long!!");
		}
		
		this._msgSubject[idx-1] = subject;
	}
	
	this.getMsgSubject = function(idx)
	{
		if(idx < 1 || idx > this._MAX_MESSAGES)
		{
			throw("Invalid email message index!");
		}
		
		return this._msgSubject[idx-1];
	}
	
	this.setPort = function(port)
	{
		this._smtpPort = parseInt(port);
	}
	
	this.getPort = function()
	{
		return this._smtpPort;
	}
	
	this.setServer = function(server)
	{	
		if(server.length > this._MAX_CFG_STRING_LEN)
		{
			throw("Server string length to long!!");
		}
		
		this._server = server;
	}
	
	this.getServer = function()
	{			
		return this._server;
	}
	
	this.setToAddress = function(address)
	{	
		if(address.length > this._MAX_CFG_STRING_LEN)
		{
			throw("To address string length to long!!");
		}
		
		this._to = address;
	}
	
	this.getToAddress = function()
	{			
		return this._to;
	}
	
	this.setFromAddress = function(address)
	{	
		if(address.length > this._MAX_CFG_STRING_LEN)
		{
			throw("From address string length to long!!");
		}
		
		this._from = address;
	}
	
	this.getFromAddress = function()
	{			
		return this._from;
	}
	
	this.setUsername = function(username)
	{	
		if(username.length > this._MAX_CFG_STRING_LEN)
		{
			throw("Username string length to long!!");
		}
		
		this._username = username;
	}
	
	this.getUsername = function()
	{			
		return this._username;
	}
	
	this.setPassword = function(password)
	{	
		if(password.length > this._MAX_CFG_STRING_LEN)
		{
			throw("Password string length to long!!");
		}
		
		this._password = password;
	}
	
	this.getPassword = function()
	{			
		return this._password;
	}
	
	
	/*data is encoded into the following structure 
	struct
	{
		EMAIL msg[8];
		UINT16 smtp_port;
		CHAR server[64];
		CHAR to[64];
		CHAR from[64];
		CHAR username[64];
		CHAR password[64];
	}NVM_EMAIL_CFG; 
	
	where EMAIL is defined as:
	struct
	{
		CHAR subject[64];
		CHAR body[256];
	}EMAIL;
	*/
			
	this.encode = function()
	{
		var str = "";
		
		/* encode EMAIL struct */
		for(var i = 0; i<this._MAX_MESSAGES; i++)
		{
			str += Encoding.encodeString(this._msgSubject[i], this._MAX_CFG_STRING_LEN);
			str += Encoding.encodeString(this._msgBody[i], this._MAX_MSG_STRING_LEN);
		}
		
		str += Encoding.encodeInt16(this._smtpPort);
		str += Encoding.encodeString(this._server, this._MAX_CFG_STRING_LEN);
		str += Encoding.encodeString(this._to, this._MAX_CFG_STRING_LEN);
		str += Encoding.encodeString(this._from, this._MAX_CFG_STRING_LEN);
		str += Encoding.encodeString(this._username, this._MAX_CFG_STRING_LEN);
		str += Encoding.encodeString(this._password, this._MAX_CFG_STRING_LEN);
		
		return str;
	}
	
	this.decode = function(str)
	{
		if(str.length != (this._DATA_STRUCT_SIZE * 2) )
		{
			throw("Invalid string length for EmailCfg data");
		}
		
		var idx = 0;
		
		/* decode EMAIL struct */
		for(var i = 0; i<this._MAX_MESSAGES; i++)
		{
			this._msgSubject[i] = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
			idx += this._MAX_CFG_STRING_LEN * 2;
			this._msgBody[i] = Encoding.decodeString(str.substr(idx, this._MAX_MSG_STRING_LEN * 2));
			idx += this._MAX_MSG_STRING_LEN * 2;
		}
		
		this._smtpPort = Encoding.decodeInt16(str.substr(idx, 4));
		idx += 4;
		this._server = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
		idx += this._MAX_CFG_STRING_LEN * 2;
		this._to = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
		idx += this._MAX_CFG_STRING_LEN * 2;
		this._from = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
		idx += this._MAX_CFG_STRING_LEN * 2;
		this._username = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
		idx += this._MAX_CFG_STRING_LEN * 2;
		this._password = Encoding.decodeString(str.substr(idx, this._MAX_CFG_STRING_LEN * 2));
		idx += this._MAX_CFG_STRING_LEN * 2;	
		
		if(this._smtpPort == 0)
		{
			this._smtpPort = 25;
		}
	}
}

var NetDevAPI = {
		
	_AppCallbacks : new Array(),
	
	getBoardStatus : function (callback)
	{	
		ajaxCommand('api/status.xml', callback, false, null);
	},
	
	
	setTTLOutput : function (output, state, callback)
	{
		if(output > 0 && output <= NUM_TTL_OUTPUTS)
		{
			NetDevAPI._AppCallbacks['setTTLOutput'] = callback;
			ajaxCommand("api/setttloutput.cgi?output=" + output + "&state=" + state, NetDevAPI._setTTLOutputHandler, false, null);
		}
		else
		{
			throw("Invalid output index");
		}
	},

	setVAR : function (varid, value, callback)
	{
		if(varid > 0 && varid <= NUM_OF_VARS)
		{
			NetDevAPI._AppCallbacks['setVAR'] = callback;
			ajaxCommand("api/setvar.cgi?varid=" + varid + "&state=" + value, NetDevAPI._setTVARHandler, false, null);
		}
		else
		{
			throw("Invalid VAR index");
		}
	},

	saveTTLOutputSates : function(callback)
	{
		NetDevAPI._AppCallbacks['saveTTLOutputSates'] = callback;
		ajaxCommand("api/saveoutputstates.cgi", NetDevAPI._saveTTLOutputSatesHandler, false, null);
	},

	sendEmail : function (msgidx, callback)
	{
		if(msgidx > 0 && msgidx <= NUM_OF_EMAILS)
		{
			NetDevAPI._AppCallbacks['sendEmail'] = callback;
			ajaxCommand("api/sendmail.cgi?msgid=" + msgidx, NetDevAPI._sendEmailHandler, false, null);
		}
		else
		{
			throw("Invalid output index");
		}
	},
	
	sendX10 : function (house_code, unit_code, cmd, callback)
	{
		if(house_code > 15 || house_code < 0) throw ("Invalid x10 house code");
		if(unit_code > 15 || unit_code < 0) throw ("Invalid x10 unit code");
		
		var c = 0;
		if(cmd == "off")
		{
			c = 0;
		}
		else if(cmd == "on")
		{
			c = 1;
		}
		else if(cmd == "bright")
		{
			c = 2;
		}
		else if(cmd == "dim")
		{
			c = 3;
		}
		else
		{
			throw("Invalid x10 command");
		}
		
		NetDevAPI._AppCallbacks['sendX10'] = callback;
		ajaxCommand("api/sendX10.cgi?hc=" + house_code + "&uc=" + unit_code + "&cmd=" + c, NetDevAPI._sendX10Handler, false, null);
	},
			
	setPLCInstructions : function (codeStr, callback)
	{
		var as = new Assembler();
		var data = as.assemble(codeStr); 
				
		NetDevAPI._AppCallbacks['setPLCInstructions'] = callback;
		ajaxCommand("api/plcdata.cgi", NetDevAPI._setPLCInstructionsHandler, false, "data="+data);
	},
	
	getPLCInstructions : function(callback)
	{
		NetDevAPI._AppCallbacks['getPLCInstructions'] = callback;
		ajaxCommand("api/plcdata.xml", NetDevAPI._getPLCInstructionsHandler, false, null);
	},
	
	
	setTempSnsrConfig : function(tsCfg, callback)
	{
		var data = tsCfg.encode();
		NetDevAPI._AppCallbacks['setTempSnsrConfig'] = callback;
		ajaxCommand("api/tscfg.cgi", NetDevAPI._setTempSnsrConfigHandler, false, "data="+data);
	},
	
	getTempSnsrConfig : function(callback)
	{
		NetDevAPI._AppCallbacks['getTempSnsrConfig'] = callback;
		ajaxCommand("api/tscfg.xml", NetDevAPI._getTempSnsrCfgHandler, false, null);
	},
	
	setIoCtrlConfig : function(ioCfg, callback)
	{
		var data = ioCfg.encode();
		NetDevAPI._AppCallbacks['setIoCtrlConfig'] = callback;
		ajaxCommand("api/iocfg.cgi", NetDevAPI.__setIoCtrlConfigHandler, false, "data="+data);
	},
	
	getIoCtrlConfig : function(callback)
	{
		NetDevAPI._AppCallbacks['getIoCtrlConfig'] = callback;
		ajaxCommand("api/iocfg.xml", NetDevAPI._getIoCtrlCfgHandler, false, null);
	},
	
	setNetworkConfig : function(netCfg, callback)
	{
		NetDevAPI._AppCallbacks['setNetworkConfig'] = callback;
		var data = netCfg.encode();
		ajaxCommand("api/netcfg.cgi", null, false, "data="+data);
		
		setTimeout("NetDevAPI._setNetworkConfigHandler(null)", 2000);
		
	},
	
	getNetworkConfig : function(callback)
	{
		NetDevAPI._AppCallbacks['getNetworkConfig'] = callback;
		ajaxCommand("api/netcfg.xml", NetDevAPI._getNetworkCfgHandler, false, null);
	},
	
	setGeneralConfig : function(genCfg, callback)
	{
		var data = genCfg.encode();
		NetDevAPI._AppCallbacks['setGeneralConfig'] = callback;
		ajaxCommand("api/gencfg.cgi", NetDevAPI._setGeneralConfigHandler, false, "data="+data);
	},
	
	getGeneralConfig : function(callback)
	{
		NetDevAPI._AppCallbacks['getGeneralConfig'] = callback;
		ajaxCommand("api/gencfg.xml", NetDevAPI._getGeneralConfigHandler, false, null);
	},
		
	setEmailConfig : function(emailCfg, callback)
	{
		var data = emailCfg.encode();
		NetDevAPI._AppCallbacks['setEmailConfig'] = callback;
		ajaxCommand("api/emailcfg.cgi", NetDevAPI._setEmailConfigHandler, false, "data="+data);
	},
	
	getEmailConfig : function(callback)
	{
		NetDevAPI._AppCallbacks['getEmailConfig'] = callback;
		ajaxCommand("api/emailcfg.xml", NetDevAPI._getEmailConfigHandler, false, null);
	},
	
	setClockTime : function(time, callback)
	{
		/* time format of string must be "MM/DD/YYYY HH:MM:SS" */
		var regEx = /^\d{2,2}\/\d{2,2}\/\d{4,4}\s\d{2,2}:\d{2,2}:\d{2,2}$/;
		if(regEx.test(time) == false)
		{
			throw("Invalid time string!");
		}
		
		NetDevAPI._AppCallbacks['setClockTime'] = callback;
		ajaxCommand("api/settime.cgi?time=" + time, NetDevAPI._setTimeHandler, false, null);
	},
		

	/***** AJAX CALLBACK HANDLERS *****/	
	_setTTLOutputHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setTTLOutput'], xmlData);
	},

	_setVARHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setVAR'], xmlData);
	},

	_saveTTLOutputSatesHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['saveTTLOutputSates'], xmlData);
	},
	
	_sendEmailHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['sendEmail'], xmlData);
	},
	
	_sendX10Handler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['sendX10'], xmlData);
	},
	
	_setPLCInstructionsHandler : function(xmlData)
	{		
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setPLCInstructions'], xmlData);
	},
	
	
	_getPLCInstructionsHandler : function (xmlData)
	{
		var str = null;
		try
		{
			if(xmlData != null)
			{
				var as = new Assembler();
				var data = getXMLValue(xmlData, 'data');
				str = as.deassemble(data); 
			}
		}
		catch(error)
		{
			alert(error);
			str = null;
		}
		
		NetDevAPI._AppCallbacks['getPLCInstructions'](str);
	},
	
	_setTempSnsrConfigHandler : function(xmlData)
	{		
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setTempSnsrConfig'], xmlData);
	},
	
	_getTempSnsrCfgHandler : function(xmlData)
	{
		var cfg = null;
		try
		{
			if(xmlData != null)
			{
				var cfg = new TempSnsrCfg();
				cfg.decode(getXMLValue(xmlData, 'data'));
			}
		}
		catch(error)
		{
			alert(error);
			cfg = null;
		}
		
		NetDevAPI._AppCallbacks['getTempSnsrConfig'](cfg);	
	},
	
	__setIoCtrlConfigHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setIoCtrlConfig'], xmlData);
	},
	
	_getIoCtrlCfgHandler : function(xmlData)
	{
		var cfg = null;
		try
		{
			if(xmlData != null)
			{
				var cfg = new IoCtrlCfg();
				cfg.decode(getXMLValue(xmlData, 'data'));
			}
		}
		catch(error)
		{
			alert(error);
			cfg = null;
		}
		
		NetDevAPI._AppCallbacks['getIoCtrlConfig'](cfg);
	},
	
	_setNetworkConfigHandler :function(xmlData)
	{
		NetDevAPI._AppCallbacks['setNetworkConfig'](null);
	},
	
	_getNetworkCfgHandler : function(xmlData)
	{
		var cfg = null;
		try
		{
			if(xmlData != null)
			{
				var cfg = new NetworkCfg();
				cfg.decode(getXMLValue(xmlData, 'data'));
			}
		}
		catch(error)
		{
			alert(error);
			cfg = null;
		}
		
		NetDevAPI._AppCallbacks['getNetworkConfig'](cfg);
	},
	
	_setGeneralConfigHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setGeneralConfig'], xmlData);	
	},
	
	_getGeneralConfigHandler : function(xmlData)
	{
		var cfg = null;
		try
		{
			if(xmlData != null)
			{
				var cfg = new GeneralCfg();
				cfg.decode(getXMLValue(xmlData, 'data'));
			}
		}
		catch(error)
		{
			alert(error);
			cfg = null;
		}
		
		NetDevAPI._AppCallbacks['getGeneralConfig'](cfg);		
	},
	
	_setEmailConfigHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setEmailConfig'], xmlData);	
	},
	
	_getEmailConfigHandler : function(xmlData)
	{
		var cfg = null;
		try
		{
			if(xmlData != null)
			{
				var cfg = new EmailCfg();
				cfg.decode(getXMLValue(xmlData, 'data'));
			}
		}
		catch(error)
		{
			alert(error);
			cfg = null;
		}
		
		NetDevAPI._AppCallbacks['getEmailConfig'](cfg);	
	},
	
	_setTimeHandler : function(xmlData)
	{
		NetDevAPI._returnSetResult(NetDevAPI._AppCallbacks['setClockTime'], xmlData);	
	},
	
	
	/*********************/
	
	_returnSetResult : function(callback, xmlData)
	{
		var str = "error";
		try
		{
			if(xmlData != null)
			{
				str = getXMLValue(xmlData, 'response');
			}
		}
		catch(error)
		{
			alert(error);
		}
		
		str = str.trim();
		if(callback != null)
		{
			callback(str);			
		}
	}
	
}



