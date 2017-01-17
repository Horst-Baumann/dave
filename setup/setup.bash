#!/bin/bash

GIT_DIR=$(git rev-parse --git-dir 2> /dev/null)
if [ ! -e $GIT_DIR ] ; then
	echo Source this script from directory inside the git repo.
	return 1
fi

# install in directory work in the top-level dir in the project
DIR=${GIT_DIR}/../work

if [ ! -e $DIR ]; then
	mkdir $DIR
fi

# normalize dir
OLD_PWD=$(pwd)
cd $DIR
DIR=$(pwd)
cd -

echo Installing in $DIR

# Install miniconda
MINICONDA=$DIR/miniconda.sh
if [ ! -e $MINICONDA ] ; then

		if [[ "$OSTYPE" == "linux-gnu" ]]; then
			#Linux
			echo "Downloading miniconda for Linux-x86_64"
			MINICONDA_URL_LINUX=https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh
			wget --quiet $MINICONDA_URL_LINUX -O $MINICONDA

		elif [[ "$OSTYPE" == "darwin"* ]]; then
      # Mac OSX
			echo "Downloading miniconda for MacOSX-x86_64"
			MINICONDA_URL_MACOS=https://repo.continuum.io/miniconda/Miniconda2-4.2.12-MacOSX-x86_64.sh
			curl $MINICONDA_URL_MACOS -o "$MINICONDA"

		else
      # Unknown.
			echo "Downloading miniconda: Unsupported OS Platform"
			return 1
		fi
fi

#Check Miniconda download result
retVal=$?
if [[ retVal -ne 0 ]] ; then
	rm $MINICONDA
	echo "Can't download MINICONDA.!!!"
	return 1
fi
chmod u+x $MINICONDA


INSTALL_DIR=$DIR/miniconda
if [ ! -e $INSTALL_DIR ]; then
  echo Installing miniconda
  $MINICONDA -b -p $INSTALL_DIR
fi
export PATH=${PATH}:${INSTALL_DIR}/bin

# Install node.js
NODE_VERSION=4.4.4
NODE_FILENAME="node-v$NODE_VERSION"

	if [[ "$OSTYPE" == "linux-gnu" ]]; then

		#Linux
		NODE_TAR=$DIR/$NODE_FILENAME.tar.xz
		NODE_LINUX_URL=https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz

		if [ ! -e $NODE_TAR ]; then
			echo "Downloading node for linux-x64"
			wget --quiet $NODE_LINUX_URL -O $NODE_TAR
			retVal=$?
			if [[ retVal -ne 0 ]] ; then
				rm $NODE_TAR
				echo "Can't download NODE for Linux-x64.!!!"
				return 1
			fi
		fi

		tar xf $NODE_TAR -C $DIR
		export PATH=$DIR/$NODE_FILENAME/bin:${PATH}

	elif [[ "$OSTYPE" == "darwin"* ]]; then

		# Mac OSX
		NODE_TAR=$DIR/$NODE_FILENAME.pkg
		NODE_MACOS_URL=https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.pkg

		if [ ! -e $NODE_TAR ]; then
			echo "Downloading node for Mac OSX"
			curl $NODE_MACOS_URL -o $NODE_TAR
			retVal=$?
			if [[ retVal -ne 0 ]] ; then
				rm $NODE_TAR
				echo "Can't download NODE fro Mac OSX!!!"
				return 1
			fi
		fi

		sudo installer -pkg $NODE_TAR -target /

	else
		# Unknown.
		echo "Downloading node: Unsupported OS Platform"
		return 1
	fi

# Test node
echo "Using node $(node --version)"
echo "Using npm $(npm --version)"

# Install Python dependencies
echo Creating Python environment
conda env create -f setup/environment.yml
source activate dave

# Installing node modules
echo Installing node modules
cd src/main/js/electron
npm install
cd -

echo "Success!!"
