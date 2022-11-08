#
#
#
package CAIWebcontrol;

require 5.004;

use vars qw($VERSION);

$VERSION = '0.01';

sub version { $VERSION; }

sub new {
	my ($class, %args) = @_;
	my $self = {};
	bless $self, ref $class || $class;
	return $self;
}

sub _normalize_version {
	my ($version) = @_;

	if (!$version) {
		# If a version isn't passed return a number that should (hopefully) always return the latest code
		return "99.99.99";
	}
	$version =~ s/^v//;     # strip off a v at the beginning of firmware version string
	if ($version =~ /(\d+)\.(\d+)\.(\d+)$/) {
		$version = sprintf("%02d.%02d.%02d", $1, $2, $3);
	}
	return $version;
}


sub versioncmp {
	my ($self, $ver1, $ver2) = @_;

	$ver1 = _normalize_version($ver1);
	$ver2 = _normalize_version($ver2);
	
	my @parts1 = split(/./, $ver1);
	my @parts2 = split(/./, $ver2);



}

sub DESTROY { }

1;
