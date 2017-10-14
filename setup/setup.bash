#!/bin/bash
#
# Source this script to set up the environment for developing DAVE.
# - Download miniconda and install packages and virtual env
# - Download node and install packages

# First check if the script is being sourced...
if [[ "${BASH_SOURCE[0]}" == "${0}" ]] ; then
	echo "This script has to be sourced! Like this:"
	echo "source $(basename $0)"
	exit
fi


GIT_DIR=$(git rev-parse --git-dir 2> /dev/null)
if [ ! -e $GIT_DIR ] ; then
	echo Source this script from directory inside the git repo.
	return 1
fi

# Install in directory work in the top-level dir in the project
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
	echo "Can't download miniconda!"
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
		export PATH=$DIR/$NODE_FILENAME-linux-x64/bin:${PATH}

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
NODE_VERSION_INSTALLED=$(node --version)
if [[ "$NODE_VERSION_INSTALLED" == v"$NODE_VERSION" ]]; then
  echo "Using node $NODE_VERSION"
else
  echo "Failure to install node, check the log."
  return 1
fi

echo "Using npm $(npm --version)"


# Install LibMagic, HDF5 and netCDF
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac OSX
    # This is for MagicFile but only applies to macosx
    if [ ! -f /usr/local/bin/brew ]; then
        if hash /opt/local/bin/port 2>/dev/null; then
            echo "Installing LibMagic, HDF5 and netCDF with MacPorts"
            yes | sudo /opt/local/bin/port install libmagic
						yes | sudo /opt/local/bin/port install hdf5
						yes | sudo /opt/local/bin/port install netcdf
        else
            echo "Please install HomeBrew or MacPorts before continue."
            echo "Run this HomeBrew installation command on a terminal and relanch DAVE:"
            echo '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"'
            echo "Or install MacPorts with this guide:"
            echo 'https://www.macports.org/install.php'
            exit 1
       fi
		else
	 		echo "Installing LibMagic, HDF5 and netCDF with HomeBrew"
	 		/usr/local/bin/brew install libmagic hdf5 netcdf
	 	fi

elif [[ "$OSTYPE" == "linux-gnu" ]]; then
	# Linux

	echo "Installing HDF5 with apt-get"
	sudo apt-get install libhdf5-serial-dev
fi


# Install Python dependencies
if conda env list | grep -q "^dave[ ]\+"; then
  echo "dave virtual Python environment already exists"
else
  echo "Creating virtual Python environment dave"
  conda env create -f setup/environment.yml
  retVal=$?
  if [[ retVal -ne 0 ]] ; then
      echo "Failed to create virtual Python environment."
      return 1

# We can try to fix it by deleting the pip cache but the case so far I've seen, deleting the pip cache doens't solve it.
#      echo "Failed to create virtual Python environment. Deleting pip cache and try again."
#      if [[ "$OSTYPE" == "linux-gnu" ]]; then
#          rm -rf ~/.cache/pip
#      elif [[ "$OSTYPE" == "darwin"* ]]; then
#          rm -rf ~/Library/Caches/pip
#      fi
#      # retry installing
#      conda env remove -y -n dave
#      conda env create -f setup/environment.yml
#      retVal=$?
#      if [[ retVal -ne 0 ]] ; then
#          echo "Failed to create virtual Python environment on second attempt too. Bailing out."
#          return 1
#      fi
  fi

fi
source activate dave

#Installing Stingray and Astropy Helpers
STINGRAY_FOLDER=$DIR/stingray
STINGRAY_URL=https://github.com/StingraySoftware/stingray.git
# Sets the specific commit to checkout:
# Oct 4th, 2017 -> https://github.com/StingraySoftware/stingray/commit/2b1ad67964218e68011a21a11ba8eaf9bddee9a8
STINGRAY_COMMIT_HASH=2b1ad67964218e68011a21a11ba8eaf9bddee9a8
LINUX_COMPILATION=lib.linux-x86_64-3.5
DARWIN_COMPILATION=lib.macosx-10.5-x86_64-3.5

if [ ! -e $STINGRAY_FOLDER ]; then

	echo Installing Stingray
	# depth 1 means only the latest commit, not the full history
	git clone --recursive --depth 1 $STINGRAY_URL $STINGRAY_FOLDER

	cd $STINGRAY_FOLDER

	# Gets specific commit version
	echo Getting specific version of Stingray
	git checkout $STINGRAY_COMMIT_HASH

	#Install stingray libraries
	echo statsmodels >> requirements.txt
	pip install -r requirements.txt

       retVal=$?
       if [[ retVal -ne 0 ]] ; then
           echo "Failed to install Stingray dependencies"
           return 1
       fi


	if [[ "$OSTYPE" == "linux-gnu" ]]; then
		#Linux

		#Build stingray
		python setup.py install

		cd $STINGRAY_FOLDER/astropy_helpers

		#Build astropy_helpers
		python setup.py install

		cd $DIR/..

		# Copy built libraries to python project
		\cp -r $STINGRAY_FOLDER/build/$LINUX_COMPILATION/stingray src/main/python
		\cp -r $STINGRAY_FOLDER/astropy_helpers/build/$LINUX_COMPILATION/astropy_helpers src/main/python

	elif [[ "$OSTYPE" == "darwin"* ]]; then
		# Mac OSX

		#Build stingray
		sudo python setup.py install

		cd $STINGRAY_FOLDER/astropy_helpers

		#Build astropy_helpers
		sudo python setup.py install

		cd $DIR/..

		# Copy built libraries to python project
		\cp -r $STINGRAY_FOLDER/build/$DARWIN_COMPILATION/stingray src/main/python
		\cp -r $STINGRAY_FOLDER/astropy_helpers/build/$DARWIN_COMPILATION/astropy_helpers src/main/python
	fi
fi

#Installing hendrics
HENDRICS_FOLDER=$DIR/hendrics
HENDRICS_URL=https://github.com/StingraySoftware/HENDRICS.git
# Sets the specific commit to checkout:
# Oct 6th, 2017 -> https://github.com/StingraySoftware/HENDRICS/commit/da59300f9a4eb97cef69b0534eafb78f22237388
HENDRICS_COMMIT_HASH=da59300f9a4eb97cef69b0534eafb78f22237388

if [ ! -e $HENDRICS_FOLDER ]; then

	echo Installing HENDRICS
	git clone --recursive --depth 1 $HENDRICS_URL $HENDRICS_FOLDER

	cd $HENDRICS_FOLDER

	# Gets specific commit version
	echo Getting specific version of HENDRICS
	git checkout $HENDRICS_COMMIT_HASH

	#Install HENDRICS libraries
	pip install -r requirements.txt

	if [[ "$OSTYPE" == "linux-gnu" ]]; then
		#Linux

		#Build HENDRICS
		python setup.py install

		cd $DIR/..

		# Copy built libraries to python project
		\cp -r $HENDRICS_FOLDER/build/$LINUX_COMPILATION/hendrics src/main/python

	elif [[ "$OSTYPE" == "darwin"* ]]; then
		# Mac OSX

		#Build HENDRICS
		sudo python setup.py install

		cd $DIR/..

		# Copy built libraries to python project
		\cp -r $HENDRICS_FOLDER/build/$DARWIN_COMPILATION/hendrics src/main/python
	fi
fi


# Installing node modules
echo Installing node modules
cd src/main/js/electron
npm install
NPM_INSTALL_STATUS=$?
cd -

if [ $NPM_INSTALL_STATUS -ne 0 ]; then
  echo "Failed to install node modules using npm install. Check the log."
  return 1
else
  echo "Success!"
fi
