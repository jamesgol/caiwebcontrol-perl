
function Assembler() 
{		
	this.Operand = function(val, delay, flags)	/* 56 bit operand */
	{
		this.value = val;	/* 32 bit signed integer */
		this.delay = delay;	/* 32 bit unsigned integer  changed 7/14/2011 from 16 bit */
		this.flags = flags;	/* 8 bit unsigned integer */
	}
	
	this.Instruction = function(opcode, o1, o2, o3)	/* 22 byte instruction */
	{
		this.opcode = opcode;	/* 8 bit */
		
		this.operands = new Array();	/* hold 3 56 bit operands */
		this.operands.push(o1);
		this.operands.push(o2);
		this.operands.push(o3);
	}
	
	this.Symbol = function (name, address)
	{
		this.name = name;
		this.address = address;
	}
	
	this.PlcData = function()	/* Raw PLC data struct size = (Instruction Count * Instruciton Size) + symbol table size = (300 * 8) + 4096 = 6500 bytes */
	{		
		this.INSTRUCTION_COUNT = 1000;	/* changed from 300 12/13/2011  */
		this.SYMBOL_TABLE_SIZE_BYTES = 0x02000;
	
		this.Instructions = new Array();	/* array of 1000 instructions */
		this.Symbols = new Array();		/* symbol array 4096 Bytes in size */
		this.InstructionCount = 0;		/* 32 bit instruction counter */
		
		
		this.addInstruction = function(instr)
		{
			this.Instructions.push(instr);
			if(this.Instructions.length > this.INSTRUCTION_COUNT)
			{
				throw("Error, Instruction count exceeds maximum allowable, count of " + this.INSTRUCTION_COUNT);
			}
		}
						
		this.addSymbol = function(sym)
		{
			this.Symbols.push(sym);
			
			var sizeBytes = 0;
			/* check size of symbol table */
			for(var i = 0; i<this.Symbols.length; i++)
			{
				sizeBytes += this.Symbols[i].name.length;
				sizeBytes += 4;	/* size of 32 bit int */
			}
		
			
			if(sizeBytes > this.SYMBOL_TABLE_SIZE_BYTES)
			{
				throw("Error, symbol table exceeds maximum size of " + this.SYMBOL_TABLE_SIZE_BYTES + " bytes!");
			}
		}
		
		this.symbolAt = function(idx)
		{
			var sym = "";
			for(var i = 0; i<this.Symbols.length; i++)
			{
				if(this.Symbols[i].address == idx)
				{
					sym = this.Symbols[i].name;
					break;
				}
			}
			
			return sym;
		}
	}
	
	this.ENCODED_PLC_DATA_SIZE = 72392;	/* SIZE IN BYTES OF ENCODED PLC_DATA STRUCTURE MAKE SURE THIS IS KEPT UPTO DATA IS DATA STRUCT SIZE CHANGES! = PLC_DATA struct size X 2 */

	this._MAX_LABEL_LENGTH 	= 10;
	this.MAX_STACK_DEPTH 	= 7;	/* max return address tack depth = 8 (7 as we use zero base) */
	this._F_VAL_NUMERIC 	= 0x01;
	this._F_VAL_IOID	= 0x02;
	this._F_VAL_DOW		= 0x04;
	this._F_VAL_ADDDRESS 	= 0x08;
	this._F_VAL_TIME	= 0x10;
	this._F_VAL_DATE	= 0x20;
	this._F_VAL_NONE	= 0x00;

	this._NON_IOID = 0;
	this._NON_OPCODE = 0;
	this._Opcodes = new Array("", "START", "TSTEQ", "TSTNE", "TSTGT", "TSTLT", "TSTGE", "TSTLE", "SET", "ADD", "SUB", "DIV", "MUL", "DEC", "INC", "AND", "OR", "XOR", "BNZ", "BZ", 
							"CNZ", "CZ", "CALLSUB", "GOTO", "DELAY", "NOP",
							"RET", "EMAIL", "X10", "PRINT", "END"); /* opcode id's start at 0x01 hence the null at index 0 */
	this._IOIdentifiers = new Array("NON_ID", "OP1", "OP2", "OP3", "OP4", "OP5", "OP6", "OP7", "OP8", "IP1", "IP2", "IP3", "IP4", "IP5", "IP6", "IP7", "IP8", "AIP1", "AIP2", "AIP3", 
							"AIP4", "AIP5", "AIP6", "AIP7","AIP8","T1", "T2", "T3", "T4", "T5",
							"T6", "T7", "T8", "H1", "EM1", "EM2", "EM3", "EM4", "EM5", "EM6", "EM7", "EM8", "CD", "CT", "CDW", "CH", "CM", "CS", "CDAY", 
							"CMONTH", "CYEAR", "CTS", "VAR1", "VAR2", "VAR3", "VAR4", "VAR5", "VAR6", "VAR7", "VAR8",
							"RAM1", "RAM2", "RAM3", "RAM4", "RAM5", "RAM6", "RAM7", "RAM8", "UROM1", "UROM2", "UROM3", "UROM4", 
							"TS1", "TS2", "TS3", "TS4", "TS5", "TS6", "TS7", "TS8");	/* io id's start at 0x01 hence the null at index 0 */
	this._DayOfWeekId = new Array("", "'SUN'", "'MON'","'TUE'","'WED'","'THU'","'FRI'","'SAT'"); /* id's start at 0x01 hence the null at index 0 */

	this._LastOpcode = "";
	this._CurrentStackDepth = 0;
	this._CurrentLine = 0;
	this._RawPlcData = new this.PlcData();

		
	/* assembles a user PLC code program into an encoded binary ready to be sent to NetDev.
	* code = string of the code to assemble
	* throws exception if errors occur
	* returns assembled and encoded data string ready to send to NetDev.
	*/
	this.assemble = function(code)
	{	
		try
		{
			this._CurrentStackDepth = 0;
			this._CurrentLine = 0;
			this._RawPlcData = new this.PlcData();
			
			var codeArray = code.split(/\n/);	/* split into lines (delimited by \n) */
			/* remove any blank lines */		
			var idx = 0;
			while(idx < codeArray.length)
			{
				if(codeArray[idx].match(/\w+/) == null)
				{
					codeArray.splice(idx,1);
					idx = 0;
				}
				else
				{
					idx ++;
				}
			}
			
			if(codeArray.length < 1)
			{
				throw("Error - PLC too short");
			}
				
			/* parse through lines of code and compile list of all labels and addresses to build the symbol table */
			var addr = 0;
			for(i = 0; i<codeArray.length; i++)
			{
				var line = codeArray[i];
				line = line.trim()	/* trim */
				line = line.toUpperCase();	/* make sure we do all operations on uppercase strings */	
				codeArray[i] = line;	/* replace with trimmed and uppercase format */
	
				var lableRegEx = /^[a-zA-Z0-9_]{0,}:$/;	/* valid format for a label is ayz:, label must appear on line only */
				if(lableRegEx.test(line))
				{
					if(line.length > this._MAX_LABEL_LENGTH)
					{
						throw("Error - label '" + line + "' to long, max characters allowed = " + this._MAX_LABEL_LENGTH);
					}
					line = line.replace(":", "");
					var sym = new this.Symbol(line, addr);
					this._RawPlcData.addSymbol(sym);
				}
				else
				{
					addr++;
				}
			}
					
			/* assemble main routine between START and END instructions */
			if(codeArray[0] != "START")
			{
				throw("Error - a 'START' instruction must appear at line 0");
			}
			
			this._RawPlcData.addSymbol(new this.Symbol("START", 0));	/* the start instruction also doubles as a label at address 0x00 */
			
			var idx = 0;
			while(idx < codeArray.length && this._LastOpcode != "END")
			{
				var line = codeArray[idx];
				if(!lableRegEx.test(line))	/* ignore labels */
				{
					this._RawPlcData.addInstruction(this._asmInstruction(line));
				}
				idx++;
				
				this._CurrentLine ++;
			}
			
			if(this._LastOpcode != "END")
			{
				throw("Error - no 'END' instruction found at end of main routine");
			}
			
			
			/* assemble remainding instructions (after END these should all be subroutines) */
			while(idx < codeArray.length)
			{
				var line = codeArray[idx];
				if(!lableRegEx.test(line))	/* ignore labels */
				{
					this._RawPlcData.addInstruction(this._asmInstruction(line));
				}
				idx++;
				
				this._CurrentLine ++;
			}
			
			return this._encode();
		}
		catch(error)
		{
			throw(error);
		}
	}
	
	
	this.deassemble = function(dataInStr)
	{
		try
		{
			var outStr = "";	
			this._decode(dataInStr);
			
			if(this._RawPlcData.InstructionCount == 0)
			{
				return "Please paste your PLC code here!";
			}
			
			/* build string of disassembled data */
			var line = 0;
			for(var i = 0; i<this._RawPlcData.InstructionCount; i++)
			{
				if(i > 0)	// to ignore START label
				{
					var sym = this._RawPlcData.symbolAt(line);
					if(sym != "")
					{
						outStr += sym + ":\n"
					}
	
					outStr += "\t";	// tab all non lables
					
				}
				
				outStr += this._Opcodes[this._RawPlcData.Instructions[i].opcode] + " ";
				for(var j = 0; j<3; j++)
				{
					var none = false;
					var operand = this._RawPlcData.Instructions[i].operands[j];
					var flags = operand.flags;

					if(flags & this._F_VAL_IOID)
					{
						outStr += this._IOIdentifiers[operand.value];
					}
					else if(flags & this._F_VAL_NUMERIC)
					{
						if(j == 2 && this._Opcodes[this._RawPlcData.Instructions[i].opcode] == "X10")
						{
							switch(operand.value)
							{
							case 0:
							case "OFF":
								outStr += "OFF";
								break;	
								
							case 1:
							case "ON":
								outStr += "ON";
								break;	
								
							case 2:
							case "BRIGHT":
								outStr += "BRIGHT";
								break;	
								
							case 3:
							case "DIM":
								outStr += "DIM";
								break;	
								
							default:
								throw "Bad x10 operand";
								break;
							}
						}
						else
						{
							outStr += operand.value;
						}
					}
					else if(flags & this._F_VAL_DOW)
					{
						outStr += this._DayOfWeekId[operand.value];
					}
					else if(flags & this._F_VAL_TIME)
					{						
						/* date is encoded into val as 32 bits as follows */
						/* byte 2 hour, byte 1 min, 0 second */
						
						var s = operand.value & 0xFF;
						var m = (operand.value >> 8) & 0xFF;
						var h = (operand.value >> 16) & 0xFF;
						
						outStr += h + ":" + m + ":" + s;				
						
					}
					else if(flags & this._F_VAL_DATE)
					{					
						/* date is encoded into val as 32 bits as follows */
						/* byte 3 month, byte 2 day, 1-0 year */			
						
						var year = operand.value & 0xFFFF;
						var day = (operand.value >> 16) & 0xFF;
						var month = (operand.value >> 24) & 0xFF;
						
						outStr += month + "/" + day + "/" + year;
					
					}
					else if(flags & this._F_VAL_ADDDRESS)
					{
						outStr += this._RawPlcData.symbolAt(operand.value);
					}
					else
					{
						/* nothing ignore this operand */
						none = true;
					}
					
					if(none == false)
					{
						/* add delay operator if a delay is specified */
						if(operand.delay > 0)
						{
							outStr += "[" + operand.delay + "]";
						}
					}
					
					outStr += " ";
				}
				
				outStr += "\n";
				
				var oc = this._Opcodes[this._RawPlcData.Instructions[i].opcode];
				if(oc == "END" || oc == "RET")	// insert extra line break between sub routines 
				{
					outStr += "\n";
				}
					
				line++;
			}
			
						
		}
		catch(error)
		{
			throw(error);
		}
				
		return outStr;
	}
	
		
	/* Assembles a full instruction 
	 * returns an Instruction object 
	 * throws an exception if an error occurs */
	this._asmInstruction = function(codeStr)
	{				
		try
		{
			var oc = 0;
			var operand1 = new this.Operand(0,0,0);
			var operand2 = new this.Operand(0,0,0);
			var operand3 = new this.Operand(0,0,0);
									
			var parts = codeStr.split(/\s+/);
							
			if(parts.length > 0)
			{
				/* assemble the opcode first */
				var opcode = parts[0];
				var operands = parts.slice(1);
				var oc = this._Opcodes.indexOf(opcode);
				if(oc < 1)
				{
					throw("Invalid opcode: " + opcode);
				}
			
				this._LastOpcode = opcode;

				switch(opcode)	/* opcode always first string */
				{
				case "TSTEQ":
				case "TSTNE":
				case "TSTGT":
				case "TSTLT":
				case "TSTGE":
				case "TSTLE":	
				case "ADD":
				case "SUB":
				case "DIV":
				case "MUL":
				case "AND":
				case "OR":
				case "XOR":
					if(operands.length >=2 && operands.length <=3)
					{
						operand1 = this._asmOperand(operands[0])
						operand2 = this._asmOperand(operands[1])
						
						if(operands.length == 3)	/* optional result destination */
						{
							operand3 = this._asmOperand(operands[2]);
						}
						else
						{
							operand3 = this._asmOperand("NON_ID");
						}
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "SET":
					if(operands.length == 2)
					{
						if(this._isIOId(operands[0]))
						{
							operand1 = this._asmOperand(operands[0]);
						}
						else
						{
							throw("Operand must be an IOID");
						}
						
						operand2 = this._asmOperand(operands[1]);
					
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "EMAIL":
				case "DELAY":
					if(operands.length == 1)
					{						
						operand1 = this._asmOperand(operands[0]);
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "X10":
					if(operands.length == 3)
					{						
						operand1 = this._asmOperand(operands[0]);	// house code
						operand2 = this._asmOperand(operands[1]);	// unit code
						
						if(operand1.value > 15 || operand1.value < 0) throw "Invald house code";
						if(operand2.value > 15 || operand2.value < 0) throw "Invald unit code";		
						
						switch(operands[2])	// command
						{
						case "0":
						case "OFF":
							operand3 = new this.Operand(0, 0, this._F_VAL_NUMERIC);
							break;
							
						case "1":
						case "ON":
							operand3 = new this.Operand(1, 0, this._F_VAL_NUMERIC);
							break;
							
						case "2":
						case "BRIGHT":
							operand3 = new this.Operand(2, 0, this._F_VAL_NUMERIC);
							break;
							
						case "3":
						case "DIM":
							operand3 = new this.Operand(3, 0, this._F_VAL_NUMERIC);
							break;
							
						default:
							throw("Ivalid x10 command operand: " + operands[2]);
							break;
							
						}
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "DEC":
				case "INC":
					if(operands.length == 1)
					{
						if(this._isIOId(operands[0]))
						{
							operand1 = this._asmOperand(operands[0]);
						}
						else
						{
							throw("Operand must be an IOID");
						}
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
										
					
				case "CNZ":
				case "CZ":
					this._StackDepth ++;
					if(this._StackDepth == this.MAX_STACK_DEPTH)
					{
						throw("Stack call depth exceeded!");
					}
					/* fall thru */
				case "BNZ":
				case "BZ":
					var lab = "";
					var ioid = "NON_ID";
					if(operands.length == 2)
					{
						/* ioid and address present */
						if(this._isIOId(operands[0]))
						{
							ioid = operands[0];
						}
						else
						{
							throw("Operand must be an IOID");
						}
						
						lab = operands[1];
					}
					if(operands.length == 1)
					{
						lab = operands[0];
					}
					
					if(lab != "")
					{
						/* look up label to find the address */
						var addr = -1;
						for(var i = 0; i<this._RawPlcData.Symbols.length; i++)
						{
							if(this._RawPlcData.Symbols[i].name == lab)
							{
								addr = this._RawPlcData.Symbols[i].address;
								break;
							}
						}
						
						if(addr > -1)
						{
							operand1 = this._asmOperand(ioid);
							operand2 = new this.Operand(addr, 0, this._F_VAL_ADDDRESS);
						}
						else
						{
							throw("Invalid operand " + lab);
						}
					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "CALLSUB":
					this._StackDepth ++;
					if(this._StackDepth == this.MAX_STACK_DEPTH)
					{
						throw("Stack call depth exceeded!");
					}
					/* fall thru */
				case "GOTO":
					if(operands.length == 1)
					{
						/* operand 1 is a label so look up label to find the address */
						var addr = -1;
						for(var i = 0; i<this._RawPlcData.Symbols.length; i++)
						{
							if(this._RawPlcData.Symbols[i].name == operands[0])
							{
								addr = this._RawPlcData.Symbols[i].address;
								break;
							}
						}
						
						if(addr > -1)
						{
							operand1 = new this.Operand(addr, 0, this._F_VAL_ADDDRESS);
						}
						else
						{
							throw("Invalid operand " + operands[0]);
						}

					}
					else
					{
						throw("Ivalid number of operands for opcode: " + opcode);
					}
					break;
					
				case "RET":
					if(this._StackDepth > 0)
					{
						this._StackDepth --;
					}
					break;
				case "NOP":
				case "END":
				case "START":
					if(operands.length != 0)
					{
						throw("Too many operands for opcode: " + opcode);
					}

					break;
					
				case "PRINT":
					// TODO need to find reg ex to split the string at quotes ""
					var parts = codeStr.split(/\s+/);
					var operands = parts.slice(1);
					
					if(operands.length > 0 && operands.length <= 3)
					{				
						if(operands.length >= 1)
						{
							operand1 = this._stringToOperand(operands[0]);
						}
						if(operands.length >= 2)
						{
							operand2 = this._stringToOperand(operands[1]);
						}
						if(operands.length >= 3)
						{
							operand3 = this._stringToOperand(operands[2]);
						}
					}
					else
					{
						throw("Invalid number of operands for opcode: " + opcode);						
					}
					 
					break;
							
				default:
					throw("Invalid opcode: " + opcode);
					break;
				}
							
			}
			else
			{
				throw("Undefined error!");
			}
		}
		catch(error)
		{
			throw("Error - PLC line " + this._CurrentLine + ": " + error);
		}

		this._RawPlcData.InstructionCount++
		return new this.Instruction(oc, operand1, operand2, operand3);
	}	
	
		
	/* assembles and return an Operand object
	 * throws an exception if an error occurs */
	this._asmOperand = function(operandStr)
	{	
		var decRegEx = /^-?[\d+][0-9]{0,9}$/;
		var hexRegEx = /^0x[0-9a-fA-F]{1,8}$/i;
		var ioidRegEx = /^[a-zA-Z]\w+$/;
		var cdRegEx = /^\d{1,2}\/\d{1,2}\/\d{4,4}$/;
		var ctRegEx = /^\d{1,2}:\d{1,2}:\d{1,2}$/;
		var cdwRegEx = /^'[a-zA-Z]{3,3}'$/;
		
		var parts = operandStr.split(/\[/);
		var val = 0;
		var delay = 0;
		var flags = this._F_VAL_NONE;

		if(parts.length > 0 && parts.length <= 2)
		{		
			for(var i = 0; i<parts.length; i++)
			{
				parts[i] = parts[i].replace("]", "");
		
				if(decRegEx.test(parts[i])) /* a decimal number */
				{
					if(i == 0)
					{
						val = parseInt(parts[i]);
						flags = this._F_VAL_NUMERIC;
					}
					else
					{
						delay = parseInt(parts[i]);
						if(delay > 0xfffffff)  // changed from 0xffff
							throw("delay to big " + delay);
					}
				}
				else if(hexRegEx.test(parts[i]))	/* a hex number 0x format only */
				{
					if(i == 0)
					{
						val = parseInt(parts[i]);
						flags = this._F_VAL_NUMERIC;
					}
					else
					{
						delay = parseInt(parts[i]);
						if(delay > 0xfffffff) // changed from 0xffff
							throw("delay to big " + delay);
					}
				}
				else if(ioidRegEx.test(parts[i])) /* a string meaning it should be an IOID */
				{
					/* look up valid IOID */
					var ioid = this._IOIdentifiers.indexOf(parts[i]);
					if(ioid < 0)
					{
						throw("Invalid IOID: " + parts[i]);
					}
					
					if(i == 0)
					{
						val = ioid;
						if(ioid > 0)
						{
							flags = this._F_VAL_IOID;
						}
						else
						{
							flags = this._F_VAL_NONE;
						}
					}
					else
					{
						delay = parseInt(parts[i]);
						if(delay > 0xfffffff)  // changed from 0xffff 
							throw("delay to big " + delay);
					}
				}
				else if(cdRegEx.test(parts[i])) /* a current date string "MM/DD/YYYY" */
				{
					var d = parts[i].split(/\//);
					var month = parseInt(d[0]);
					var day = parseInt(d[1]);
					var year = parseInt(d[2]);
					
					/* date encoded into 32 bits as follows */
					/* byte 3 month, byte 2 day, 1-0 year */
					val = month << 24;
					val |= d << 16;
					val |= year;
					
					flags = this._F_VAL_DATE;
					
				}
				else if(ctRegEx.test(parts[i])) /* a current time string "HH:MM:SS" */
				{
					var d = parts[i].split(/:/);
					var hour = parseInt(d[0]);
					var minute = parseInt(d[1]);
					var second = parseInt(d[2]);
					
					/* date encoded into 32 bits as follows */
					/* byte 2 hour, byte 1 min, 0 second */
					val = hour << 16;
					val |= minute << 8;
					val |= second;
					
					flags = this._F_VAL_TIME;
				}
				else if(cdwRegEx.test(parts[i])) /* a current day of week string "xxx" (sun, mon, tue, wed, thr, fri, sat) */
				{
					var dow = this._DayOfWeekId.indexOf(parts[i]);
					if(dow < 0)
					{
						throw("Invalid day of week '" + parts[i] + "'");
					}
					flags = this._F_VAL_DOW;
					val = dow;
				}
				else
				{
					throw("Invalid operand: " + operandStr);
				}
			}
			
			return new this.Operand(val, delay, flags);			
		}
		else
		{
			throw("Invalid operand: " + operandStr);
		}
		
	}
	
	/* tests if a string matches an IOID 
	 * returns true if str matches IOID */
	this._isIOId = function(str)
	{
		var parts = str.split(/\[/);
		if(parts.length > 0)
		{
			if(this._IOIdentifiers.indexOf(parts[0]) > this._NON_IOID)
			{
				return true;
			}
		}
		
		return false;
	}
			
	this._encode = function()
	{
		var dataStr = "";
		
		/* encode instruction counter */
		dataStr += Encoding.encodeInt32(this._RawPlcData.InstructionCount);
		
		/* pad instructions to max instructions with null data */
		for(var i = this._RawPlcData.Instructions.length; i<this._RawPlcData.INSTRUCTION_COUNT; i++)
		{
			this._RawPlcData.addInstruction(new this.Instruction(0, new this.Operand(0, 0, 0), new this.Operand(0, 0, 0), new this.Operand(0, 0, 0)));
		}
		
		/* encode instructions to a hex string */
		for(var i = 0; i<this._RawPlcData.INSTRUCTION_COUNT; i++)
		{			
			/* opcode */
			dataStr += Encoding.encodeByte(this._RawPlcData.Instructions[i].opcode);
			
			/* operands 3 operands per instruction */
			for(var j = 0; j<3; j++)
			{
				dataStr += Encoding.encodeInt32(this._RawPlcData.Instructions[i].operands[j].value);	/* value */
				// dataStr += Encoding.encodeInt16(this._RawPlcData.Instructions[i].operands[j].delay); /* the delay val */
				dataStr += Encoding.encodeInt32(this._RawPlcData.Instructions[i].operands[j].delay); /* the delay val */
				dataStr += Encoding.encodeByte(this._RawPlcData.Instructions[i].operands[j].flags); /* the 8 bit mask */		
			}
		}
		
		/* encode symbol table */
		symStr = "";
		for(var i = 0; i<this._RawPlcData.Symbols.length; i++)
		{
			symStr += Encoding.encodeInt32(this._RawPlcData.Symbols[i].address) + Encoding.encodeString(this._RawPlcData.Symbols[i].name) + Encoding.encodeString(";");
		}
		/* pad out encoded string to maximum length of symbol table */
		var maxSymStrLength = this._RawPlcData.SYMBOL_TABLE_SIZE_BYTES * 2;
		for(var i = symStr.length; i<maxSymStrLength; i+=2)
		{
			symStr += Encoding.encodeString(";");	/* pad with end of symbol */
		}
		
		dataStr += symStr;
				
		return dataStr;
	}
	
	this._decode = function(dataStr)
	{	
		if(dataStr.length != this.ENCODED_PLC_DATA_SIZE)
		{
			throw("Invalid decode data string length " + dataStr.length);
		}
		
		var strIdx = 0;
		this._RawPlcData = new this.PlcData();
		
		/* decode instruction counter */
		this._RawPlcData.InstructionCount = Encoding.decodeInt32(dataStr.substr(strIdx, 8));
		strIdx += 8;

		/* decode and build instructions */
		for(var i = 0; i<this._RawPlcData.INSTRUCTION_COUNT; i++)
		{
			/* create the opcode and 3 operands from the data string */
			var opcode = Encoding.decodeByte(dataStr.substr(strIdx, 2));
			strIdx +=2;
			
			var operands = new Array();
			/* 3 operands per instruction */
			for(var j = 0; j<3; j++)
			{
				var val = Encoding.decodeInt32(dataStr.substr(strIdx, 8));	/* value */
				strIdx += 8;
				// var delay = Encoding.decodeInt16(dataStr.substr(strIdx, 4)); /* the delay val , change from 4 to 8 by wyu*/
				var delay = Encoding.decodeInt32(dataStr.substr(strIdx, 8)); /* the delay val , change from 4 to 8 by wyu*/
				// strIdx += 4;	
				strIdx += 8;		// now we need to move 32 bits instead of 16 bit, encoded into twice size!														
				var flags = Encoding.decodeByte(dataStr.substr(strIdx, 2)); /* the 8 bit mask */		
				strIdx += 2;
				
				operands.push(new this.Operand(val, delay, flags));
			}

			this._RawPlcData.addInstruction(new this.Instruction(opcode, operands[0], operands[1], operands[2]));
		}
				
		/* decode and build symbol table */
		var len = dataStr.length;		
		while(strIdx < len)
		{
			var addr = Encoding.decodeInt32(dataStr.substr(strIdx, 8));
			strIdx += 8;
			
			var name = new String("");
			var c = "";
			while( (c != ";") && (strIdx < dataStr.length) )
			{
				c = Encoding.decodeString(dataStr.substr(strIdx, 2));
				strIdx += 2;
				if(c != ";")
				{
					name += c;
				}
			}
			
			if(name != "")
			{
				this._RawPlcData.addSymbol( new this.Symbol(name, addr));
			}
			else
			{
				break;
			}
			
		}
				
	}
}


