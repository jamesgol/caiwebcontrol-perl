package CAIWebcontrol::PLCData;

require 5.004;

use strict;
use warnings;
use CAIWebcontrol;
use Sort::Versions;

use vars qw(@ISA $VERSION);
@ISA = ( 'CAIWebcontrol' );

$VERSION = $CAIWebcontrol::VERSION;

sub new {
	my ($class, $fwversion) = @_;
	my $self = {};

	$self->{'_FW_VERSION'} = $fwversion; # Expected to be normalized by now
	if (versioncmp($self->{'_FW_VERSION'}, '03.02.11') == -1) {
		# FW less than 03.02.11
		$self->{'INSTRUCTION_COUNT'} = 300;
		$self->{'SYMBOL_TABLE_SIZE_BYTES'} = 0x01000;
	} else {
		# FW 03.02.11 increased values
		$self->{'INSTRUCTION_COUNT'} = 1000;
		$self->{'SYMBOL_TABLE_SIZE_BYTES'} = 0x02000;
	}

	$self->{'Instructions'} = []; # array of instructions
	$self->{'Symbols'} = []; # symbol array 
	$self->{'InstructionCount'} = 0;


	bless $self, ref $class || $class;
	return $self;
}

sub addInstruction {
	my ($self, %instr) = @_;

	push(@{$self->{'Instructions'}}, \%instr);
	if ($#{$self->{'Instructions'}} > $self->{'INSTRUCTION_COUNT'}) {
		die "Error, Instruction count exceeds maximum allowable count of " . $self->{'INSTRUCTION_COUNT'};
	}
}

sub addSymbol {
	my ($self, %sym) = @_;

	push(@{$self->{'Symbols'}}, \%sym);
	my $sizeBytes = 0;
	#check size of symbol table 
	for (my $i = 0; $i < scalar @{$self->{'Symbols'}}; $i++) {
		$sizeBytes += length(@{$self->{'Symbols'}}[$i]);
		$sizeBytes += 4;  # size of 32 bit int
	}
	if ($sizeBytes > $self->{'SYMBOL_TABLE_SIZE_BYTES'}) {
		die "Error, symbol table exceeds maximum size of " . $self->{'SYMBOL_TABLE_SIZE_BYTES'} . " bytes!";
	}

}

sub symbolAt {
	my ($self, $idx) = @_;

	my $sym = '';
	for (my $i = 0; $i <= $#{$self->{'Symbols'}}; $i++) {
		if ($self->{'Symbols'}[$i]{'Address'} == $idx) {
			$sym = $self->{'Symbols'}[$i]{'Name'};
			last;
		}
	}
	return $sym;
}

1;
