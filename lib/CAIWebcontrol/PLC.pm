package CAIWebcontrol::PLC;

require 5.004;

use strict;
use warnings;
use CAIWebcontrol;
use CAIWebcontrol::PLCData;
use Data::Dumper;
use POSIX;
use Sort::Versions;
use Switch 'fallthrough';

use vars qw(@ISA $VERSION);
@ISA = ( 'CAIWebcontrol' );

$VERSION = $CAIWebcontrol::VERSION;

sub new {
	my ($class, $fwversion) = @_;
	my $self = {};
	$self->{'_FW_VERSION'} = _normalize_version($fwversion);

	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') == -1) {
		# FW less than 03.02.11
		$self->{'ENCODED_PLC_DATA_SIZE'} = 25000;
	} else {
		# FW 03.02.11 increased this size
		$self->{'ENCODED_PLC_DATA_SIZE'} = 72392;
	}

	$self->{'_MAX_LABEL_LENGTH'} = 10;
	$self->{'_F_VAL_NUMERIC'} = 0x01;
	$self->{'_F_VAL_IOID'} = 0x02;
	$self->{'_F_VAL_DOW'} = 0x04;
	$self->{'_F_VAL_ADDRESS'} = 0x08;
	$self->{'_F_VAL_TIME'} = 0x10;
	$self->{'_F_VAL_DATE'} = 0x20;
	$self->{'_F_VAL_NONE'} = 0x00;

	$self->{'_NON_IOID'} = 0;
	$self->{'_NON_OPCODE'} = 0;

	# opcode id's start at 0x01 hence the null at index 0
	$self->{'_Opcodes'} = ['', 'START', 'TSTEQ', 'TSTNE', 'TSTGT', 'TSTLT', 'TSTGE', 'TSTLE', 'SET', 'ADD', 'SUB',
			'DIV', 'MUL', 'DEC', 'INC', 'AND', 'OR', 'XOR', 'BNZ', 'BZ', 'CNZ', 'CZ', 'CALLSUB', 'GOTO',
			'DELAY', 'NOP', 'RET', 'EMAIL', 'X10', 'PRINT', 'END']; 

	# io id's start at 0x01 hence the null at index 0
	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') == -1) {
		# Firmware less than 03.02.11
		$self->{'_IOIdentifiers'} = ['NON_ID', 'OP1', 'OP2', 'OP3', 'OP4', 'OP5', 'OP6', 'OP7', 'OP8', 'IP1', 'IP2',
				'IP3', 'IP4', 'IP5', 'IP6', 'IP7', 'IP8', 'AIP1', 'AIP2', 'AIP3', 'AIP4', 'AIP5', 'AIP6',
				'AIP7', 'AIP8', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'H1', 'EM1', 'EM2', 'EM3',
				'EM4', 'EM5', 'EM6', 'EM7', 'EM8', 'CD', 'CT', 'CDW', 'CH', 'CM', 'CS', 'CDAY', 'CMONTH', 
				'CYEAR', 'VAR1', 'VAR2', 'VAR3', 'VAR4', 'VAR5', 'VAR6', 'VAR7', 'VAR8', 'RAM1', 'RAM2',
				'RAM3', 'RAM4', 'RAM5', 'RAM6', 'RAM7', 'RAM8', 'TS1', 'TS2', 'TS3', 'TS4', 'TS5', 'TS6',
				'TS7', 'TS8'];
	} else {
		# Firmware 03.02.11 added CTS, UROM1, UROM2, UROM3, and UROM4
		$self->{'_IOIdentifiers'} = ['NON_ID', 'OP1', 'OP2', 'OP3', 'OP4', 'OP5', 'OP6', 'OP7', 'OP8', 'IP1', 'IP2',
				'IP3', 'IP4', 'IP5', 'IP6', 'IP7', 'IP8', 'AIP1', 'AIP2', 'AIP3', 'AIP4', 'AIP5', 'AIP6',
				'AIP7', 'AIP8', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'H1', 'EM1', 'EM2', 'EM3',
				'EM4', 'EM5', 'EM6', 'EM7', 'EM8', 'CD', 'CT', 'CDW', 'CH', 'CM', 'CS', 'CDAY', 'CMONTH', 
				'CYEAR', 'CTS', 'VAR1', 'VAR2', 'VAR3', 'VAR4', 'VAR5', 'VAR6', 'VAR7', 'VAR8', 'RAM1', 'RAM2',
				'RAM3', 'RAM4', 'RAM5', 'RAM6', 'RAM7', 'RAM8', 'UROM1', 'UROM2', 'UROM3', 'UROM4', 'TS1', 'TS2', 
				'TS3', 'TS4', 'TS5', 'TS6', 'TS7', 'TS8'];
	}
	
	# id's start at 0x01 hence the null at index 0 
	$self->{'_DayOfWeekId'} = ['', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

	$self->{'_LastOpCode'} = '';
	$self->{'_CurrentLine'} = 0;
	$self->{'_RawPlcData'} = '';

	bless $self, ref $class || $class;
	return $self;
}

sub _normalize_version {
	my ($version) = @_;

	if (!$version) {
		# If a version isn't passed return a number that should (hopefully) always return the latest code
		return "99.99.99";
	}
	$version =~ s/^v//;	# strip off a v at the beginning of firmware version string
	if ($version =~ /(\d+)\.(\d+)\.(\d+)$/) {
		$version = sprintf("%02d.%02d.%02d", $1, $2, $3);
	}
	return $version;
}


sub _trim {
	my ($self, $str) = @_;
	if ($str) {
		$str =~ s/^\s+//;
		$str =~ s/\s+$//;
		return $str;
	}
}

sub _decodeByte {
	my ($self, $str) = @_;

	die "_decodeByte, string length must be == 2" if (length($str) > 2);
	return unpack("C", pack("H*", $str));
}

sub _encodeString {
	my ($self, $str) = @_;

#	return if (!defined($str));
	return uc(unpack("H*", pack("A*", $str)));
}	

sub _encodeBool {
	my ($self, $b) = @_;

	if ($b) {
		return $self->_encodeByte(1);
	} else {
		return $self->_encodeByte(0);
	}
}

#don't think anything is using _encodeInt16 but I added it just in case
sub _encodeInt16 {
	my ($self, $val) = @_;

	if (defined($val)) {
		return uc(unpack("H*", pack("s*", $val)));
	} else {
		return '0000';
	}
}

sub _encodeInt32 {
	my ($self, $val) = @_;

	if (defined($val)) {
		return uc(unpack("H*", pack("l*", $val)));
	} else {
		return '00000000';
	}
}

sub _encodeByte {
	my ($self, $b) = @_;

	my $output = '00';

	if (defined($b)) {
		if (!isdigit($b)) {
			$b = ord(substr($b, 0, 1));
		}
		$output = uc(unpack("H2", pack("C", $b)));
	}
	return $output;
}

sub _encodeIpAddress {
	my ($self, $str) = @_;

	my $output;

	if ($str =~ /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/) {
		$output .= $self->_encodeByte($1);
		$output .= $self->_encodeByte($2);
		$output .= $self->_encodeByte($3);
		$output .= $self->_encodeByte($4);
	} else {
		die "Not an IP address: $str";
	}
	return $output;
}


sub _decodeString {
	my ($self, $str) = @_;

	die "_decodeString, invalid string length, must be multiple of 2" if ((length($str) % 2) != 0);

	my $output = '';
	for (my $i = 0; $i < length($str); $i+=2) {
		my $cc = $self->_decodeByte(substr($str, $i, 2));
		if ($cc != 0) {
			$output .= chr($cc);
		}
	}
	return $self->_trim($output);
}

sub _decodeBool {
	my ($self, $str) = @_;

	die "_decodeBool, invalid string length, must be == 2" if (length($str) != 2);

	my $ret = 0;
	$ret |= $self->_decodeByte($str);
	return $ret;
}

sub _decodeIpAddress {
	my ($self, $str) = @_;

	if (length($str) != 8) {
		die "decodeIpAddress, string length must be == 8";
	}
	my $output;
	my $idx = 0;
	for (my $i = 0; $i < 4; $i++) {
		$output .= $self->_decodeByte(substr($str, $idx, 2));
		$idx += 2;
		if ($i < 3) {
			$output .= '.';
		}
	}
	return $output;
}

sub _decodeInt16 {
	my ($self, $str) = @_;

	die "_decodeInt16, invalid string length " . length($str) . ", must be == 4" if (length($str) != 4);
	return unpack("s", pack("H*", $str));
}

sub _decodeInt32 {
	my ($self, $str) = @_;

	die "_decodeInt32, invalid string length, must be == 8" if (length($str) != 8);

	return unpack("l", pack("H*", $str));
}

sub encode_general {
	my ($self, $ref) = @_;

	my $str;
	$str .= $self->_encodeInt32($ref->{'clockAdjust'});
	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') >= 0) {
		# Firmware >= 03.02.11 adds UROM variables and increases struct size to 22
		$str .= $self->_encodeInt32($ref->{'UROM1'});
		$str .= $self->_encodeInt32($ref->{'UROM2'});
		$str .= $self->_encodeInt32($ref->{'UROM3'});
		$str .= $self->_encodeInt32($ref->{'UROM4'});
	}
	$str .= $self->_encodeByte($ref->{'ajaxPolling'});
	$str .= $self->_encodeByte(0);	# padding

	return $str;
}


sub decode_general {
	my ($self, $dataInStr) = @_;

	my $struct_size;
	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') == -1) {
		# FW less than 03.02.11
		$struct_size = 6;
	} else {
		$struct_size = 22;
	}
	my $len = length($dataInStr);

	die "Invalid string length for GenCfg data" if ($len != $struct_size * 2);

	my $ref = {};
	my $strIdx = 0;
	$ref->{'clockAdjust'} = $self->_decodeInt32(substr($dataInStr, $strIdx, 8));
	$strIdx += 8;
	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') >= 0) {
		# Firmware >= 03.02.11 adds UROM variables and increases struct size to 22
		$struct_size = 22;
		$ref->{'UROM1'} = $self->_decodeInt32(substr($dataInStr, $strIdx, 8));
		$strIdx += 8;
		$ref->{'UROM2'} = $self->_decodeInt32(substr($dataInStr, $strIdx, 8));
		$strIdx += 8;
		$ref->{'UROM3'} = $self->_decodeInt32(substr($dataInStr, $strIdx, 8));
		$strIdx += 8;
		$ref->{'UROM4'} = $self->_decodeInt32(substr($dataInStr, $strIdx, 8));
		$strIdx += 8;
	}
	$ref->{'ajaxPolling'} = $self->_decodeBool(substr($dataInStr, $strIdx, 2));
	$strIdx += 2;

	return $ref;
}


#assembles a user PLC code program into an encoded binary ready to be sent to NetDEV
#$code = string of the code to assemble
#
sub assemble {
	my ($self, $code) = @_;

	my $labelRegEx = '^\w+:$'; # valid format for a label is ayz:, label must appear on line only
	$self->{'_CurrentLine'} = 0;
	$self->{'_RawPlcData'} = new CAIWebcontrol::PLCData($self->{'_FW_VERSION'});

	# remove any white space
	$code =~ s/(^|\n)[\n\s]*/$1/g;

	my @codeArray = split("\n", $code); # split into lines (delimited by \n)
	die "Error - PLC too short" . $#codeArray . "\n" if ($#codeArray < 1);

	# parse through lines of code and compile list of all labels and addresses to build the symbol table
	my $addr = 0;
	for (my $i = 0; $i <= $#codeArray; $i++) {
		my $line = $codeArray[$i];
		$line = $self->_trim($line);
		$line = uc($line); # make sure we do all operations on upper case strings
		$codeArray[$i] = $line; # replace with trimmed and uppercase format
		if ($line =~ /$labelRegEx/) {
			if (length($line) > $self->{'_MAX_LABEL_LENGTH'}) {
				die "Error - label '" . $line . "too long, max chars allowed = " . $self->{'_MAX_LABEL_LENGTH'};
			}
			$line =~ s/://g;
			$self->{'_RawPlcData'}->addSymbol(('Name' => $line, 'Address' => $addr));
		} else {
			$addr++;
		}
	}

	# assemble main routine between START and END instructions
	if ($codeArray[0] ne 'START') {
		die "Error - a 'START' instruction must appear at line 0";
	}
	# the START instruction also doubles as a label at address 0x00
	$self->{'_RawPlcData'}->addSymbol(('Name' => 'START', 'Address' => 0));

	my $idx = 0;
	while (($idx <= $#codeArray) && ($self->{'_LastOpCode'} ne 'END')) {
		my $line = $codeArray[$idx];
		if ($line !~ /$labelRegEx/) { # ignore labels
			$self->{'_RawPlcData'}->addInstruction($self->_asmInstruction($line));
		}
		$idx++;
		$self->{'_CurrentLine'}++;
	}
	if ($self->{'_LastOpCode'} ne 'END') {
		die "Error - no 'END' instruction found at end of main routine . $self->{'_LastOpCode'}";
	}

	#assemble remaining instructions (after END these should all be subroutines
	while ($idx <= $#codeArray) {
		my $line = $codeArray[$idx];
		if ($line !~ /$labelRegEx/) { # ignore labels
			$self->{'_RawPlcData'}->addInstruction($self->_asmInstruction($line));
		}
		$idx++;
		$self->{'_CurrentLine'}++;
	}
	return $self->_encode;
}

sub disassemble {
	my ($self, $dataInStr) = @_;

	my $outStr = '';
	$self->_decode($dataInStr);

	if ($self->{'_RawPlcData'}->{'InstructionCount'} == 0) {
		return "Please paste your PLC code here!";
	}

	# build string of disassembled data
	my $line = 0;
	for (my $i = 0; $i < $self->{'_RawPlcData'}->{'InstructionCount'}; $i++) {
		if ($i > 0) {	# to ignore START label
			my $sym = $self->{'_RawPlcData'}->symbolAt($line);
			if ($sym) {
				$outStr .= $sym . ":\n";
			}
			$outStr .= "\t"; # tab all non labels
		}
		my $oc = $self->{'_Opcodes'}[$self->{'_RawPlcData'}->{'Instructions'}[$i]{'opcode'}];

		$outStr .=  "$oc ";
#		$outStr .= "(". $self->{'_RawPlcData'}->{'Instructions'}[$i]{'opcode'} . ")";
		for (my $j = 0; $j < 3; $j++) {
			my $none = 0;
			my $operand = $self->{'_RawPlcData'}->{'Instructions'}[$i]{'operands'}[$j];
			my $flags = $operand->{'flags'};
			if ($flags & $self->{'_F_VAL_IOID'}) {
				$outStr .= $self->{'_IOIdentifiers'}[$operand->{'val'}];
			} elsif ($flags & $self->{'_F_VAL_NUMERIC'}) {
				if ($j == 2 && $self->{'_Opcodes'}[$self->{'_RawPlcData'}->{'Instructions'}[$i]->{'opcode'}] eq 'X10') {
					#TODO X10 switch
				} else {
					$outStr .= $operand->{'val'};
				}
			} elsif ($flags & $self->{'_F_VAL_DOW'}) {
				$outStr .= '\'' . $self->{'_DayOfWeekId'}[$operand->{'val'}] . '\'';
			} elsif ($flags & $self->{'_F_VAL_TIME'}) {
				# time is encoded into val as 32 bits as follows
				# byte 2 hour, byte 1 min, byte 0 second
				my $s = ($operand->{'val'} & 0xFF);
				my $m = (($operand->{'val'} >> 8) & 0xFF);
				my $h = (($operand->{'val'} >> 16) & 0xFF);
				$outStr .= "$h:$m:$s";
			} elsif ($flags & $self->{'_F_VAL_DATE'}) {
				# date is encoded into val as 32 bits as follows
				# byte 3 month, byte 2 day, byte day, byte 1-0 year
				my $year = ($operand->{'val'} & 0xFFFF);
				my $day = (($operand->{'val'} >> 16) & 0xFF);
				my $month = (($operand->{'val'} >> 24) & 0xFF);
				$outStr .= "$month/$day/$year";
			} elsif ($flags & $self->{'_F_VAL_ADDRESS'}) {
				$outStr .= $self->{'_RawPlcData'}->symbolAt($operand->{'val'});
			} else {
				# Nothing, ignore this operand
				$none = 1;
			}

			if ($none == 0) {
				# add delay operator if a delay is specified 
				if ($operand->{'delay'} > 0) {
					$outStr .= '[' . $operand->{'delay'} . ']';
				}
			}
			$outStr .= " ";
		}
		$outStr .= "\n";

		if (($oc eq "END") || ($oc eq "RET")) { # insert extra line break between subs
			$outStr .= "\n";
		}
		$line++;
	}
			

	return $outStr;
}

sub _find_id {
	my ($self, $code, @array) = @_;

	for (my $x = 0; $x <= $#array; $x++) {
		if ($code eq $array[$x]) {
			return $x;
		}
	}
	return 0;
}

sub _asmInstruction {
	my ($self, $codeStr) = @_;

	my $oc = 0;
	my @operand1 = (0, 0, 0);
	my @operand2 = (0, 0, 0);
	my @operand3 = (0, 0, 0);
	my %ophash;

	my @parts = split(/\s+/, $codeStr);

#print STDERR "_asmInstruction $codeStr\n";
	if (@parts) {
		# assemble the opcode first
		my $opcode = shift(@parts);
		my @operands = @parts;
		$oc = $self->_find_id($opcode, @{$self->{'_Opcodes'}} );
		die "Invalid opcode: $oc " . $opcode . " ($codeStr)" if ($oc < 1);
		$self->{'_LastOpCode'} = $opcode;
		$ophash{'opcode'} = $oc;
		my $numOperands = ($#operands + 1);

		switch ($opcode) { # opcode always first string
			case [  'TSTEQ',
				'TSTNE',
				'TSTGT',
				'TSTLT',
				'TSTGE',
				'TSTLE',
				'ADD',
				'SUB',
				'DIV',
				'MUL',
				'AND',
				'OR',
				'XOR' ] {
				if ($numOperands >= 2 && $numOperands <= 3) {
					@operand1 = $self->_asmOperand($operands[0]);
					@operand2 = $self->_asmOperand($operands[1]);
					if ($numOperands == 3) { # optional result destination
						@operand3 = $self->_asmOperand($operands[2]);
					} else {
						@operand3 = $self->_asmOperand('NON_ID');
					}
				} else {
					die "Invalid number of operands for opcode $opcode ($codeStr)";
				}
				last;
			}
			case 'SET'	{
				if ($numOperands == 2) {
					if ($self->_isIOId($operands[0])) {
						@operand1 = $self->_asmOperand($operands[0]);
					} else {
						die "Operand must be an IOID ($codeStr)";
					}
					@operand2  = $self->_asmOperand($operands[1]);
				} else {
					die "Invalid number of operands for opcode $opcode - " . $operands[1];
				}
				last;
			}
			case [  'EMAIL', 
				'DELAY'] {
				if ($numOperands == 1) {
					@operand1 = $self->_asmOperand($operands[0]);
				} else {
					die "Invalid number of operands for opcode $opcode = $numOperands: ($codeStr)";
				}
				last;
			}
			case 'X10'	{
				# TODO
				last;
			}
			case [  'DEC',
				'INC'] 	{
				if ($numOperands == 1) {
					if ($self->_isIOId($operands[0])) {
						@operand1 = $self->_asmOperand($operands[0]);
					} else {
						die "Operand must be an IOID";
					}
				}
				last;
			}
			case [  'BNZ',
				'BZ',
				'CNZ',
				'CZ' ]	{
				my $lab;
				my $ioid = 'NON_ID';
				if ($numOperands == 2) {
					# ioid and address present
					if ($self->_isIOId($operands[0])) {
						$ioid = $operands[0];
					} else {
						die "Operand must be an IOID ($codeStr)";
					}
					$lab = $operands[1];
				}
				if ($numOperands == 1) {
					$lab = $operands[0];
				}
				if ($lab) {
					# look up label to find the address
					my $addr = -1;
					for (my $i = 0; $i <= $#{$self->{'_RawPlcData'}->{'Symbols'}}; $i++) {
						if ($self->{'_RawPlcData'}->{'Symbols'}[$i]{'Name'} eq $lab) {
							$addr = $self->{'_RawPlcData'}->{'Symbols'}[$i]{'Address'};
							last; 
						}
					}
					if ($addr > -1) {
						@operand1 = $self->_asmOperand($ioid);
						@operand2 = ($addr, 0, $self->{'_F_VAL_ADDRESS'});
					} else {
						die "Invalid label $lab";
					}
				} else {
					die "Invalid number of operands for opcode $opcode";
				}
				last;
			}
			case [	'GOTO',
				'CALLSUB'] {
				if ($numOperands == 1) {
					# look up label to find the address
					my $addr = -1;
					for (my $i = 0; $i <= $#{$self->{'_RawPlcData'}->{'Symbols'}}; $i++) {
						if ($self->{'_RawPlcData'}->{'Symbols'}[$i]{'Name'} eq $operands[0]) {
							$addr = $self->{'_RawPlcData'}->{'Symbols'}[$i]{'Address'};
							last; 
						}
					}
					if ($addr > -1) {
						@operand1 = ($addr, 0, $self->{'_F_VAL_ADDRESS'});
					} else {
						die "Invalid label $operands[0] ($codeStr)";
					}
				} else {
					die "Invalid number of operands for opcode $opcode ($codeStr)";
				}
				last;
			}
			case 'RET'	{
				last;
			}
			case [  'NOP',
				'END',
				'START'] {
				if   ($numOperands != 0) {
					die "Too many operands for opcode $opcode";
				}
				last;
			}
			case 'PRINT'	{
				# TODO will add this when CAI actually implements PRINT
				last;
			}
			default		{
				die "Invalid opcode $opcode ($codeStr)";
				last;
			}
		
		}	
	}
	$self->{'_RawPlcData'}->{'InstructionCount'}++;
	$ophash{'operands'}[0] = \@operand1;
	$ophash{'operands'}[1] = \@operand2;
	$ophash{'operands'}[2] = \@operand3;
	return %ophash;
}

sub _asmOperand {
	my ($self, $operandStr) = @_;

	my @parts = split(/\[/, $operandStr);
	my $val = 0;
	my $delay = 0;
	my $flags = $self->{'_F_VAL_NONE'};

	if (@parts && $#parts <= 2) {
		for (my $i = 0; $i <= $#parts; $i++) {
			$parts[$i] =~  s/\]//g;
			if ($parts[$i] =~ /^\-*[0-9]+$/) { # a decimal number or a hex number 0x format only
				if ($i == 0) {
					$val = $parts[$i];
					$flags = $self->{'_F_VAL_NUMERIC'};
				} else {
					$delay = $parts[$i];
					if ($delay > 0xfffffff) {
						die "delay to big " . $delay;
					}
				}
			} elsif ($parts[$i] =~ /^0x[0-9a-fA-F]{1,8}$/i) { # a hex number 0x format only
				if ($i == 0) {
					$val = hex(lc($parts[$i]));
					$flags = $self->{'_F_VAL_NUMERIC'};
				} else {
					$delay = $parts[$i];
					if ($delay > 0xfffffff) {
						die "delay to big " . $delay;
					}
				}
			} elsif ($parts[$i] =~ /^[a-zA-Z]\w+$/) { # a string meaning it should be an IOID
				# look up valid IOID
				my $ioid = $self->_find_id($parts[$i], @{$self->{'_IOIdentifiers'}});
				if ($ioid < 0) {
					die "Invalid IOID: " . $parts[$i];
				}
				if ($i == 0) {
					$val = $ioid;
					if ($ioid > 0) {
						$flags = $self->{'_F_VAL_IOID'};
					} else {
						$flags = $self->{'_F_VAL_NONE'};
					}
				} else {
					$delay = $parts[$i];
					if ($delay > 0xfffffff) {
						die "delay to big " . $delay;
					}
					
				}
			} elsif ($parts[$i] =~ /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) { # a current date string "MM/DD/YYYY"
				my $month = $1;
				my $day = $2;
				my $year = $3;

				# date encoded into 32 bits as follows
				# byte 3 month, byte 2 day, byte 1-0 year
				$val = ($month << 24);
				$val |= ($day << 16);
				$val |= ($year);
				$flags = $self->{'_F_VAL_DATE'};
			} elsif ($parts[$i] =~ /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/) { # a current time string "HH:MM:SS"
				my $hour = $1;
				my $minute = $2;
				my $second = $3;

				# time encoded into 32 bits as follows
				$val = ($hour << 16);
				$val |= ($minute << 8);
				$val |= ($second);
				$flags = $self->{'_F_VAL_TIME'};
			} elsif ($parts[$i] =~ /^'([a-zA-Z]{3})'$/) { # a current day of week string "xxx" (sun, mon, ...)
				my $dow = $self->_find_id($1, @{$self->{'_DayOfWeekId'}});
				if ($dow < 0) {
					die "Invalid day of week '" . $parts[$i] . "'";
				}
				$val = $dow;
				$flags = $self->{'_F_VAL_DOW'};
			} else {
				die "Invalid operand: " . $operandStr;
			}
		}
		return ($val, $delay, $flags);

	} else {
		die "Invalid operand: " . $operandStr;
	}		
}

sub _isIOId {
	my ($self, $str) = @_;

	my @parts = split(/\[/, $str);
	if (@parts) {
		if ($self->_find_id($parts[0], @{$self->{'_IOIdentifiers'}}) > $self->{'_NON_IOID'}) {
			return 1;
		}

	}

	return 0;
}

sub _encode {
	my ($self) = @_;

	my $dataStr;

	# encode instruction counter
	$dataStr .= $self->_encodeInt32($self->{'_RawPlcData'}->{'InstructionCount'});

	# pad instruction to max instructions with null data
	for (my $i = $#{$self->{'_RawPlcData'}->{'Instructions'}}; $i < $self->{'_RawPlcData'}->{'INSTRUCTION_COUNT'}; $i++) {
		$self->{'_RawPlcData'}->addInstruction( ('opcode' => 0, 'operands' => [ [0, 0, 0], [0, 0, 0], [0, 0, 0]]));
	}
	# encode instructions to a hex string
	for (my $i = 0; $i < $self->{'_RawPlcData'}->{'INSTRUCTION_COUNT'}; $i++) {
		# opcode
		my $insStr = $self->_encodeByte($self->{'_RawPlcData'}->{'Instructions'}[$i]{'opcode'});
		my @operands = @{$self->{'_RawPlcData'}->{'Instructions'}[$i]{'operands'}};
		# operands 3 operands per instruction
		for (my $j = 0; $j < 3; $j++) {
#				$insStr .= $self->_encodeInt32($operands[$j]{'value'}); #value
#				$insStr .= $self->_encodeInt32($operands[$j]{'delay'}); #delay
#				$insStr .= $self->_encodeByte($operands[$j]{'flags'}); #flags
#			$insStr .= $self->_encodeInt32($operands[$j][0] ? $operands[$j][0] : 0); #value
			$insStr .= $self->_encodeInt32($operands[$j][0]); #value
			$insStr .= $self->_encodeInt32($operands[$j][1]); #delay
			$insStr .= $self->_encodeByte($operands[$j][2]); #flags
		}
		$dataStr .= $insStr;
#print STDERR "_encode $insStr\n";
	}

	# encode symbol table
	my $symStr;
	for (my $i = 0; $i <= $#{$self->{'_RawPlcData'}->{'Symbols'}}; $i++) {
		$symStr .= $self->_encodeInt32($self->{'_RawPlcData'}->{'Symbols'}[$i]->{'Address'}) . $self->_encodeString($self->{'_RawPlcData'}->{'Symbols'}[$i]->{'Name'}) . $self->_encodeString(';');
	}
	my $maxSymStrLength = $self->{'_RawPlcData'}->{'SYMBOL_TABLE_SIZE_BYTES'} * 2;
	for (my $i = length($symStr); $i < $maxSymStrLength; $i+=2) {
		$symStr .= $self->_encodeString(';'); # pad with end of symbol
	}
	$dataStr .= $symStr;

	return $dataStr;
}

sub _decode {
	my ($self, $dataStr) = @_;

	my $dataStrLen = length($dataStr);
	die "Invalid decode data string length ($dataStrLen != " . $self->{'ENCODED_PLC_DATA_SIZE'} . ")\n" if ($dataStrLen != $self->{'ENCODED_PLC_DATA_SIZE'});

	my $strIdx = 0;
	$self->{'_RawPlcData'} = new CAIWebcontrol::PLCData($self->{'_FW_VERSION'});
	
	$self->{'_RawPlcData'}->{'InstructionCount'} = $self->_decodeInt32((substr($dataStr, $strIdx, 8)));
	$strIdx += 8;
	for (my $i = 0; $i < $self->{'_RawPlcData'}->{'INSTRUCTION_COUNT'}; $i++) {
		#create the opcode and 3 operands from the data string
		my %ophash;
		my $opcode = $self->_decodeByte(substr($dataStr, $strIdx, 2));
		$ophash{'opcode'} = $opcode;
		$strIdx += 2;

		my @operands = ();
		for (my $j = 0; $j < 3; $j++) {
			my %arr;
			$arr{'val'} = $self->_decodeInt32(substr($dataStr, $strIdx, 8));
			$strIdx += 8;
			$arr{'delay'} = $self->_decodeInt32(substr($dataStr, $strIdx, 8));
			$strIdx += 8;
			$arr{'flags'} = $self->_decodeByte(substr($dataStr, $strIdx, 2));
			$strIdx += 2;
			push(@operands, \%arr);
		}
		$ophash{'operands'} = \@operands;
		$self->{'_RawPlcData'}->addInstruction(%ophash);
	}

	# decode and build symbol table
	my $len = length($dataStr);
	while ($strIdx < $len) {
		my $addr = $self->_decodeInt32(substr($dataStr, $strIdx, 8));
		$strIdx += 8;
		my $name = '';
		my $c = '';
		while ( ($c ne ';') && ($strIdx < length($dataStr) )) {
			$c = $self->_decodeString(substr($dataStr, $strIdx, 2));
			$strIdx += 2;
			if ($c ne ";") {
				$name .= $c;
			}
		}

		if ($name) {
			$self->{'_RawPlcData'}->addSymbol(('Name' => $name, 'Address' => $addr));
		} else {
			last;
		}
	}
}



1;
