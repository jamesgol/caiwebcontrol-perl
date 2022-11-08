use ExtUtils::MakeMaker;

WriteMakefile (
	NAME		=> 'CAIWebcontrol-perl',
	VERSION_FROM	=> 'lib/CAIWebcontrol.pm',
	AUTHOR		=> 'James Golovich <james@gnuinter.net>',
	ABSTRACT	=> 'CAI Webcontrol Perl Interface',
	PMLIBDIRS	=> [ 'lib' ],
        PREREQ_PM       => { 'RRDs' => 0, 
                             'Getopt::ArgvFile' => 0,
			     'Switch' => 0,
			     'XML::Simple' => 0,
			     'File::Slurp' => 0,
			     'Sort::Versions' => 0},

	'dist'		=> {
				COMPRESS => 'gzip -9f', SUFFIX => 'gz',
				DIST_DEFAULT => 'tardist'
			},
);
