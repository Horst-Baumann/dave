#!/bin/bash

# Determine the directory containing this script
if [[ -n $BASH_VERSION ]]; then
		_SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")
else
    echo "Only bash supported."
    exit 1
fi


# install in directory work in the top-level dir in the project
DIR=$_SCRIPT_FOLDER/../..
WORKDIR=$HOME/Dave_work

if [ ! -e $WORKDIR ]; then
	echo "Creating work directory: $WORKDIR"
	mkdir $WORKDIR
fi

# normalize dir
OLD_PWD=$(pwd)
cd $DIR
DIR=$(pwd)
cd -

echo Installing in $WORKDIR

# Install miniconda
MINICONDA=$WORKDIR/miniconda.sh
if [ ! -e $MINICONDA ] ; then

		if [[ "$OSTYPE" == "linux-gnu" ]]; then
			#Linux
			echo "Downloading miniconda for Linux-x86_64..."
			MINICONDA_URL_LINUX=https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh
			wget --quiet $MINICONDA_URL_LINUX -O $MINICONDA

		elif [[ "$OSTYPE" == "darwin"* ]]; then
      # Mac OSX
			echo "Downloading miniconda for MacOSX-x86_64..."
			MINICONDA_URL_MACOS=https://repo.continuum.io/miniconda/Miniconda2-4.2.12-MacOSX-x86_64.sh
			curl $MINICONDA_URL_MACOS -o "$MINICONDA"

		else
      # Unknown.
			echo "Downloading miniconda: Unsupported OS Platform."
			return 1
		fi
fi

#Check Miniconda download result
retVal=$?
if [[ retVal -ne 0 ]] ; then
	rm $MINICONDA
	echo "Can´t download MINICONDA."
	return 1
fi
chmod u+x $MINICONDA

#Install Miniconda
INSTALL_DIR=$WORKDIR/miniconda
if [ ! -e $INSTALL_DIR ]; then
  echo "Installing miniconda"
  $MINICONDA -b -p $INSTALL_DIR
fi
export PATH=${PATH}:${INSTALL_DIR}/bin


# Install Python dependencies
echo "Creating Python environment"
conda env create -f $DIR/environment.yml
