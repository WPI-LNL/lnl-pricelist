default: node_modules
	node_modules/jake/bin/cli.js

node_modules:
	npm install

clean: node_modules
	node_modules/jake/bin/cli.js clean
