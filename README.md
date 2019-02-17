# Token Wrapper
## Current Rinkeby Deployment -- token-wrapper.open.aragonpm.eth v1.0.3
 - Contract address: 0x93B8E239E1047e0c9cDcce6247a23c16973c56Fb
 - Content (ipfs): QmeEG37AzHo5Ax5igvaCDsyka5QPnsBQP3u9fuC898tJdY
 - Transaction hash: 0xa65e2d6ceaf389c6dcbfb72118e56c5675b181f77e682ac5485bf35468962547

## Installing an Rinkeby
 - [Follow this guide to deploy a custom Aragon DAO](https://forum.aragon.org/t/guide-custom-aragon-organization-deployment-using-the-cli/507)
 - Instead of installing token-manager, install token-wrapper.open.aragonpm.eth:
 ```sh
 dao install [dao-address] token-wrapper.open.aragonpm.eth --app-init none
 ```
 - Follow all all the same direction, using the token-wrapper address anywhere it says to use the token manager address
 - However, to initialize the app you must pass some different parameters:
 ```sh
 dao exec [dao-address] [token-wrapper-address] initialize [token-address] [erc20-address] true
 ```

## Local Usage

Kit support requires using the Aragon CLI with a version greater than 4.1.0.
```sh
npm install -g @aragon/cli
```

## Run the kit

```sh
aragon run --kit Kit --kit-init @ARAGON_ENS
```

## Running your app

### Using HTTP

Running your app using HTTP will allow for a faster development process of your app's front-end, as it can be hot-reloaded without the need to execute `aragon run` every time a change is made.

- First start your app's development server running `npm run start:app`, and keep that process running. By default it will rebuild the app and reload the server when changes to the source are made.

- After that, you can run `npm run start:aragon:http` or `npm run start:aragon:http:kit` which will compile your app's contracts, publish the app locally and create a DAO. You will need to stop it and run it again after making changes to your smart contracts.

Changes to the app's background script (`app/script.js`) cannot be hot-reloaded, after making changes to the script, you will need to either restart the development server (`npm run start:app`) or rebuild the script `npm run build:script`.

### Using IPFS

Running your app using IPFS will mimic the production environment that will be used for running your app. `npm run start:aragon:ipfs` will run your app using IPFS. Whenever a change is made to any file in your front-end, a new version of the app needs to be published, so the command needs to be restarted.

## What's in the box?

### npm Scripts

- **start** or **start:aragon:ipfs**: Runs your app inside a DAO served from IPFS
- **start:aragon:http**: Runs your app inside a DAO served with HTTP (hot reloading)
- **start:aragon:ipfs:kit**: Creates a DAO with the Kit and serves the app from IPFS
- **start:aragon:http:kit**: Creates a DAO with the Kit and serves the app with HTTP (hot reloading)
- **start:app**: Starts a development server for your app
- **compile**: Compile the smart contracts
- **build**: Builds the front-end and background script
- **build:app**: Builds the front-end
- **build:script**: Builds the background script
- **test**: Runs tests for the contracts
- **publish:minor**: Release a minor version to aragonPM
- **publish:major**: Release a major version to aragonPM with a potentially new contract address for on-chain upgrades

### Libraries

- [**@aragon/os**](https://github.com/aragon/aragonos): Aragon interfaces
- [**@aragon/client**](https://github.com/aragon/aragon.js/tree/master/packages/aragon-client): Wrapper for Aragon application RPC
- [**@aragon/ui**](https://github.com/aragon/aragon-ui): Aragon UI components (in React)

## Licensing

Note that the [Kit contract](contracts/Kit.sol) has a special requirement on licensing because it includes contract dependencies that are licensed as `GPL-3.0-or-later`. This is the only file in your project that is required to be licensed this way, and you are free to choose a different license for the rest of the project.
