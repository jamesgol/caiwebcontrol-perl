use strict;
use Test::More 'no_plan';

use lib '../lib';
use lib 'lib';


use CAIWebcontrol::PLC;

# test ip address encode/decode
ok(test_ipaddress('0.0.0.0'), "test_ipaddress('0.0.0.0')");
ok(test_ipaddress('192.168.1.1'), "test_ipaddress('192.168.1.1')");
ok(test_ipaddress('255.255.255.255'), "test_ipaddress('255.255.255.255')");
#ok(!test_ipaddress('99999'), "!test_ipaddress('99999')");

# test byte encode/decode
ok(test_byte(0), 'testbyte(0)');
ok(test_byte(127), 'testbyte(127)');
ok(test_byte(255), 'testbyte(255)');
ok(!test_byte(-1), '!testbyte(-1)');

#test int16 encode/decode
ok(test_int16(0));
ok(test_int16(32767));
ok(test_int16(-32768));
ok(!test_int16(32768));
ok(!test_int16(-32769));

#test int32 encode/decode
ok(test_int32(0));
ok(test_int32(2147483647));
ok(test_int32(-2147483648));
ok(!test_int32(2147483648));
ok(!test_int32(-2147483649));

#test string encode/decode
ok(test_string(';'));
ok(test_string('Z'));
ok(test_string('abcdefghijklmnopqrstuvwxyz'));
ok(test_string('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
ok(test_string('abc1234def'));











my $testencode;


#Test all the unique operand encodings we should support
$testencode = <<EOF;
START
	ADD 0xABF 0x010
	ADD 02/10/2010 03/10/2010
	ADD 20:25:00 22:22:00
	ADD 'Sun' 'Tue'
END
EOF
ok(test_code($testencode), 'Unique operand encodings');


#Example 1 from CAI's manual
$testencode = <<EOF;
START 
	TSTLE T3 370  
	CALLSUB  HEAT_ON 
	TSTGT T3 389 
	CALLSUB  HEAT_OFF   
END 

HEAT_ON: 
	SET  OP1  1 
RET 

HEAT_OFF: 
	SET  OP1  0 
RET
EOF
ok(test_code($testencode), 'CAI test 1');

#Example 2 from CAI's manual
$testencode = <<EOF;
START 
TSTEQ OP2[500] 0 
SET OP2 1 
TSTEQ OP2[500] 1 
SET OP2 0
END
EOF
ok(test_code($testencode), 'CAI test 2');

#Example 3 from CAI's manual
$testencode = <<EOF;
START 
 TSTEQ IP1 1 OP3 
 TSTEQ OP3 1 
 SET OP3 0 
END
EOF
ok(test_code($testencode), 'CAI test 3');

#Example 4 from CAI's manual
$testencode = <<EOF;
START 

  SET RAM2 0 
LOOP: 

  SUB T3 T2 RAM1 

  TSTGE RAM1 200 RAM1 

  GOTO SEND 

  SET RAM2 0 

  GOTO LOOP 

 END 

 SEND: 

  BNZ RAM2 LOOP   

  SET RAM2 1 

  EMAIL EM1 

  GOTO LOOP  
EOF
ok(test_code($testencode), 'CAI test 4');

#Example 5 from CAI's manual
$testencode = <<EOF;
START

 CALLSUB checkOP1 

 CALLSUB checkOP2 
 CALLSUB checkOP3 

 CALLSUB checkOP4 

 GOTO start

END 

checkOP1: 

 TSTGT T3 500 OP1 

 RET 

checkOP2: 

 TSTEQ IP1[300] 1 OP2 

 RET 

checkOP3: 

 AND AIP1 AIP3 RAM1 

 TSTGT RAM1 1024 

 BNZ l1 

 TSTEQ IP4 1 

 BNZ l2 

 RET  

l1:  

SET OP3 1 

 RET 

l2:  

SET OP3 0 

 RET 

checkOP4: 

 TSTEQ OP1 1 OP4 

 RET
EOF
ok(test_code($testencode), 'CAI test 5');




#Example 6 from CAI's manual
$testencode = <<EOF;
START 

  BNZ IP1 start 

 l1:  

TSTEQ IP1 1 

  BZ  l1 

  SET OP1 1 

  SET OP4 0 

 l2:  

TSTGT T3 250 RAM1 

  AND OP1 RAM1 

  BZ  l2 

  SET OP2 1 

  EMAIL EM1 

     

 l3:  

TSTEQ OP2[1000] 1 

  BZ  l3 

  SET OP4 1 

  SET OP1 0 

 END
EOF
ok(test_code($testencode), 'CAI test 6');


#Example 7 from CAI's manual
$testencode = <<EOF;
START 

 CALLSUB LIGHTS_GO 

loop:  

 SET VAR1[10000] 1 

loop1:  

 TSTEQ IP1 1 
 BNZ sr 

 BZ VAR1 sr 

 GOTO loop1 

sr: 

 CALLSUB STOP 

 GOTO loop 

END  

LIGHTS_ST: 

 SET OP1 1 

 SET OP2 0 

 SET OP3 0 

 RET 

LIGHTS_GO: 

 SET OP1 0 

 SET OP2 0 

 SET OP3 1 

 RET 

LIGHTS_AM: 

 SET OP1 0 

 SET OP2 1 

 SET OP3 0 

 RET 

STOP: 

 CALLSUB LIGHTS_AM 

 DELAY 5000 

 CALLSUB LIGHTS_ST 

 DELAY 60000 

 CALLSUB LIGHTS_AM 

 SET RAM2 5 

flash:  

 XOR OP2 1 OP2 

 DELAY 500 

 DEC RAM2 

 BNZ flash 

 CALLSUB LIGHTS_GO 

 RET
EOF
ok(test_code($testencode), 'CAI test 7');

#Example 8 from CAI's manual
$testencode = <<EOF;
START     

 CALLSUB HOURLY    

 CALLSUB PERIOD    

 CALLSUB DAILY    

 CALLSUB MONTHLY    

 CALLSUB YEARLY    

END     

HOURLY: 

 TSTNE RAM1 CH   

 GOTO T1    

RET     

T1: 

 SET RAM1 CH   

 SUB AIP1 AIP2 RAM2  

 TSTGT RAM2 10   

 EMAIL EM1    

RET     

PERIOD: 

 TSTGE CH 18 RAM2  

 NOP     

 TSTLE CH 5 RAM3  

 NOP     

 OR RAM2 RAM3 OP1  

RET     

DAILY: 

 TSTEQ CH 7   

 SET RAM5 0   

 TSTEQ CH 6   

 BZ  NOTYET   

 TSTGT CM 30   

 CALLSUB WATERING    

NOTYET: 

RET     

MONTHLY: 

 TSTNE RAM4 CMONTH   

 GOTO T2    

RET     

T2: 

 TSTLE CH 8
 GOTO 2EARLY    

 SET RAM4 CMONTH   

 TSTLT AIP3 20   

 EMAIL EM2    

2EARLY: 

RET     

YEARLY: 

 TSTEQ CMONTH 1 RAM2  

 NOP     

 TSTEQ CDAY 1 RAM3  

 NOP     

 AND RAM2 RAM3 OP6  

RET     

WATERING: 

 BNZ RAM5 W_DONE   

ZONE1: 

 SET OP2 1   

 TSTLE CM 35   

 GOTO ZONE1    

 SET OP2 0   

ZONE2: 

 SET OP3 1   

 TSTLE CM 40   

 GOTO ZONE2    

 SET OP3 0   

ZONE3: 

 SET OP4 1   

 TSTLE CM 45   

 GOTO ZONE3    

 SET OP4 0   

ZONE4: 

 SET OP5 1   

 TSTLE CM 50   

 GOTO ZONE4    

 SET OP5 0   

 SET RAM5 1   

W_DONE: 

RET 
EOF
ok(test_code($testencode), 'CAI test 8');

#Example 9 from CAI's manual
$testencode = <<EOF;
start 

set op1 1 

set op2 1 

set op3 1 

set RAM1 0 

set RAM2 0 

set RAM3 0 

loop: 

cnz op1 check_b1 

cnz op2 check_b2 

cnz op3 check_b3 

goto loop 

end 

check_b1: 

BNZ RAM1 c1 

tstle AIP1 100 RAM1 

bz e1 

c1: 

tstgt AIP1 125 

bnz e1 

set op1 0 

set op4 1 

e1: 

ret 

check_b2: 

BNZ RAM2 c2 

sub AIP2 AIP1 RAM4 

tstle RAM4 100 RAM2 

bz e2 
c2: 

sub AIP2 AIP1 RAM4 

tstgt RAM4 125 

bnz e2 

set op2 0 

set op5 1 

e2: 

ret 

check_b3: 

BNZ RAM3 c3 

sub AIP3 AIP2 RAM4 

sub RAM4 AIP1 RAM4 

tstle RAM4 100 RAM3 

bz e3 

c3: 

sub AIP3 AIP2 RAM4 

sub RAM4 AIP1 RAM4 

tstgt RAM4 125 

bnz e3 

set op3 0 

set op6 1 

e3: 

ret
EOF
ok(test_code($testencode), 'CAI test 9');

#Example 10 from CAI's manual
$testencode = <<EOF;
START     

 CALLSUB LIGHTS    

 TSTEQ RAM1 0   

 CALLSUB SET_OP1    

 CALLSUB CHK4LOW    

 TSTEQ OP1[1000] 1   

 SET OP1 0   

END     

CHK4LOW: 

 TSTEQ IP1 0   

 SET RAM1 0   

 RET     
SET_OP1: 

 TSTEQ IP1 1 RAM1  

 SET OP1 1   

 RET     

LIGHTS: 

 TSTGE CH 19 RAM2  

 NOP     

 TSTLE CH 5 RAM3  

 NOP     

 OR RAM2 RAM3 OP3  

 RET   
EOF
ok(test_code($testencode), 'CAI test 10');






sub test_code {
	my ($code, $fwversion) = @_;
	my $PLC = new CAIWebcontrol::PLC($fwversion);
	my $a = $PLC->assemble($code);

	my $PLC2 = new CAIWebcontrol::PLC($fwversion);
	my $c = $PLC2->disassemble($a);

	my $PLC3 = new CAIWebcontrol::PLC($fwversion);
	my $a2 = $PLC3->assemble($c);

	return ($a eq $a2);
}

sub test_ipaddress {
	my ($val) = @_;
	my $PLC = new CAIWebcontrol::PLC;
	my $t1 = $PLC->_encodeIpAddress($val);
	my $t2 = $PLC->_decodeIpAddress($t1);
	return($val eq $t2);

}

sub test_byte {
	my ($val) = @_;
	my $PLC = new CAIWebcontrol::PLC;
	my $t1 = $PLC->_encodeByte($val);
	my $t2 = $PLC->_decodeByte($t1);
	return($val == $t2);
}

sub test_int16 {
	my ($val) = @_;
	my $PLC = new CAIWebcontrol::PLC;
	my $t1 = $PLC->_encodeInt16($val);
	my $t2 = $PLC->_decodeInt16($t1);
	return($val == $t2);
}

sub test_int32 {
	my ($val) = @_;
	my $PLC = new CAIWebcontrol::PLC;
	my $t1 = $PLC->_encodeInt32($val);
	my $t2 = $PLC->_decodeInt32($t1);
	return($val == $t2);
}

sub test_string {
	my ($val) = @_;
	my $PLC = new CAIWebcontrol::PLC;
	my $t1 = $PLC->_encodeString($val);
	my $t2 = $PLC->_decodeString($t1);
	return($val eq $t2);
}

