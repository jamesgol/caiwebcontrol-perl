
var Encoding = {
		
	encodeString : function (str, length)
	{
		str = str.trim();
		while(str.length < length)
		{
			str += '\0'
		}
		
		var output = "";
		for(var i = 0; i<str.length; i++)
		{
			output += this.encodeByte(str.charCodeAt(i));
		}
		
		return output;
	},
	
	encodeBool : function (b)
	{
		return (b == true) ? this.encodeByte(1) : this.encodeByte(0);
	},
	
	encodeInt16 : function (val)
	{
		var output = "";
		
		/* multibyte values for the PIC need to be LSB first */
		output += this.encodeByte(val & 0xFF);
		output += this.encodeByte(val >> 8);
		
		return output;		
	},
	
	encodeInt32 : function (val)
	{
		var output = "";
		/* multibyte values for the PIC need to be LSB first */
		output += this.encodeByte(val & 0xFF);
		output += this.encodeByte(val >> 8);
		output += this.encodeByte(val >> 16);
		output += this.encodeByte(val >> 24);
		
		return output;
	},
	
	
	encodeByte : function (b)
	{
		var hexChars = "0123456789ABCDEF";
		
		if(isNaN(b))
		{
			b = b.charCodeAt(0);		
		}
		
		var output = hexChars.charAt( (b >> 4) & 0x0F);
		output +=	 hexChars.charAt( (b & 0x0F));
			
		return output;

	},
	
	encodeIpAddress : function(str)
	{
		var output = "";
		if(Encoding.ipAddressValid(str) == false)
		{
			throw("Not an ip address");
		}
		
		var parts = str.split(".");
		for(var i = 0; i<parts.length; i++)
		{
			output += Encoding.encodeByte(parseInt(parts[i]));
		}
		
		return output;
	},
	
	
	
	/* decodes */
	decodeString : function (str)
	{
		if( (str.length % 2) != 0)
		{
			throw("decodeString, invalid string length, must be multiple of 2");	
		}
		
		var output = "";
		for(var i = 0; i<str.length; i+=2)
		{
			var cc = this.decodeByte(str.substr(i,2));
			if(cc != 0)
			{
				output += String.fromCharCode(cc);
			}
		}
		
		return output.trim();
	},
	
	decodeBool : function (str)
	{
		if(str.length != 2)
		{
			throw("decodeBool, invalid string length, must be == 2");	
		}
		
		var ret = 0;
		ret |= this.decodeByte(str);
		return (ret > 0) ? true : false;
	},
	
	decodeInt16 : function (str)
	{
		if(str.length != 4)
		{
			throw("decodeInt16, invalid string length, must be == 4");	
		}
		
		return this._parseHexInt(str);
	},
	
	decodeInt32 : function (str)
	{
		if(str.length != 8)
		{
			throw("decodeInt32, invalid string length, must be == 8");	
		}
		
		return this._parseHexInt(str);
	},
	
	
	decodeByte : function (str)
	{
		var hexChars = "0123456789ABCDEF";
		var output = "";
		
		var error = true;
				
		if(str.length > 2)
		{
			throw("decodeByte, string length must be == 2");
		}
		
		// MSB
		for(var i = 0; i<16; i++)
		{
			if(hexChars.charAt(i) == str.charAt(0))
			{
				output = i;
				output <<= 4;
				
				error = false;
				break;
			}
		}
		
		if(error)
		{
			throw("decodeByte, invalid char found");
		}
		
		error = true;
		// LSB
		for(var i = 0; i<16; i++)
		{
			if(hexChars.charAt(i) == str.charAt(1) )
			{
				output |= i;
				
				error = false;
				break;
			}
		}
		
		if(error)
		{
			throw("decodeByte, invalid char found");
		}
		
		return output;	
	},
	
	decodeIpAddress : function(str)
	{
		var output = "";
		if(str.length != 8)
		{
			throw("decodeIpAddress, string length must be == 8");
		}
		
		var idx = 0;
		for(var i = 0; i<4; i++)
		{
			var oct = Encoding.decodeByte(str.substr(idx, 2));
			idx +=2;
						
			output += oct;
			if(i < 3)
			{
				output += "."
			}
		}
		
		
		return output;
	},
	
	ipAddressValid : function(ipAddr)
	{
		var regEx = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/
		return regEx.test(ipAddr);
	},
	
	_parseHexInt : function(str)
	{
		/* mutlibyte data from the PIC is received LSB first */
		if(str.length < 8)
		{
			var c = "0";
			if( (str.charAt(str.length-2) == "8") ||
							(str.charAt(str.length-2) == "9") ||
							(str.charAt(str.length-2) == "A") ||
							(str.charAt(str.length-2) == "B") ||
							(str.charAt(str.length-2) == "C") ||
							(str.charAt(str.length-2) == "D") ||
							(str.charAt(str.length-2) == "E") ||
							(str.charAt(str.length-2) == "F") )
			{
				c = "F";
			}
			
			for(var i = str.length; i<8; i++) 
			{
				str = str + c;
			}
		}
		
		var output = 0;
		var rs = str.length/2;
		for(var i = str.length - 2; i>=0; i-=2)
		{
			var b = this.decodeByte(str.substr(i, 2));
			b <<= ( (rs-=1) * 8);
			output |= b;
		}
		
		return output;

	}
	
						   
}
















