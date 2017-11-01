#!/bin/bash

sendError()
{
	#Notifies Node.js that create_env script crashed
	if [ "$#" -gt "0" ];then
		echo "$1"
		echo "@ERROR@|$1|"
		if [ "$#" -gt "1" ];then
			if [[ ! -z "$2" ]];then
				rm -rf $2
			fi
		fi
	fi
	exit 10
}

checkReturnCode()
{
	#Checks if return code is an error code and sends error to Node.js
	if [[ $1 -ne 0 ]] ; then
		sendError "$2" "$3"
	fi
}

# Determine the directory containing this script
if [[ -n $BASH_VERSION ]]; then
		_SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")
else
		sendError "Only bash supported"
fi

# Activate environment progress notification
echo "@PROGRESS@|10|Installing LibMagic|"

#Check for LibMagic on Mac first for avoid user to wait all downloads if this crash
if [[ "$OSTYPE" == "darwin"* ]]; then
	# Mac OSX

	#This is for MagicFile but only applies to macosx
	if [ ! -f /usr/local/bin/brew ]; then
		if hash /opt/local/bin/port 2>/dev/null; then

				# Make sure only root can run our script
				if [ "$(id -u)" != "0" ]; then
				 echo "You need Administrator privileges to continue with the installation."
				 echo "LibMagic will be installed with MacPorts, try relanching the application as root"
				 echo "or run this HomeBrew installation command on a terminal and relanch DAVE:"
 				 echo '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"'
				 sendError "Administrator privileges requiered"
				fi

				echo "Installing LibMagic with MacPorts"
        su /opt/local/bin/port install file
    else
				echo "Please install HomeBrew or MacPorts before continue."
				echo "Run this HomeBrew installation command on a terminal and relanch DAVE:"
				echo '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"'
				echo "Or install MacPorts with this guide:"
				echo 'https://www.macports.org/install.php'
				sendError "HomeBrew or MacPorts requiered"
    fi
	else
		echo "Installing LibMagic with HomeBrew"
		/usr/local/bin/brew install libmagic
	fi
fi

# Install in directory work in the top-level dir in the project
echo "@PROGRESS@|15|Creating Python Environment folder|"
DIR=$_SCRIPT_FOLDER/../..
WORKDIR=$HOME/.dave

if [ ! -e $WORKDIR ]; then
	echo "Creating Python Environment folder: $WORKDIR"
	mkdir $WORKDIR
fi

# normalize dir
OLD_PWD=$(pwd)
cd $DIR
DIR=$(pwd)
cd -

echo "Installing in $WORKDIR"
echo "@PROGRESS@|20|Downloading miniconda|"

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
      # Unknown OS.
			sendError "Error downloading miniconda: Unsupported OS Platform" $WORKDIR
		fi
fi

#Check Miniconda download result
checkReturnCode $? "Can´t download MINICONDA, error $?" $WORKDIR
chmod u+x $MINICONDA

#Install Miniconda
echo "@PROGRESS@|35|Installing miniconda|"
INSTALL_DIR=$WORKDIR/miniconda
if [ ! -e $INSTALL_DIR ]; then
  echo "Installing miniconda"
  $MINICONDA -b -p $INSTALL_DIR
	checkReturnCode $? "Can´t install MINICONDA, error $?" $WORKDIR
fi
export PATH=${PATH}:${INSTALL_DIR}/bin

# Install Python dependencies
echo "@PROGRESS@|50|Creating Python environment|"
echo "Creating Python environment"
conda env create -f $DIR/environment.yml
checkReturnCode $? "Can´t create MINICONDA environment, error $?" $WORKDIR

# Marks the environment as success installation
\cp -r $DIR/resources/version.txt $WORKDIR
echo "@PROGRESS@|60|Python environment ready|"
echo "Python environment ready!"
