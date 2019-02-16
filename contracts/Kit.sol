/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";

import "@aragon/apps-voting/contracts/Voting.sol";
import "./TokenWrapper.sol";
import "./StandardToken.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

contract KitBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployInstance(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = KitBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}

contract Kit is KitBase {
    MiniMeTokenFactory tokenFactory;

    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    string tokenName = 'Token';
    string tokenSym = 'TKN';
    uint8 tokenDecimals = 18;
    uint256 tokenSupply = 10**30;
    uint256 lockAmount = 10**23;
    uint256[] lockIntervals = [0, 3, 12];
    uint256[] tokenIntervals = [1, 2, 3];

    constructor(ENS ens) KitBase(DAOFactory(0), ens) {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);
        address root = msg.sender;
        bytes32 votingAppId = apmNamehash("voting");
        bytes32 tokenWrapperAppId = apmNamehash("token-wrapper");


        Voting voting = Voting(dao.newAppInstance(votingAppId, latestVersionAppBase(votingAppId)));
        TokenWrapper tokenWrapper = TokenWrapper(dao.newAppInstance(tokenWrapperAppId, latestVersionAppBase(tokenWrapperAppId)));

        MiniMeToken token = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Wrapped Token", tokenDecimals, "WTKN", true);
        token.changeController(tokenWrapper);

        StandardToken erc20 = new StandardToken(tokenName, tokenSym, tokenDecimals, tokenSupply);
        erc20.transfer(msg.sender, tokenSupply);
        tokenWrapper.initialize(address(token), address(erc20), true);

        // Initialize apps
        voting.initialize(token, 50 * PCT, 20 * PCT, 1 days);

        acl.createPermission(this, tokenWrapper, tokenWrapper.WRAP_ROLE(), this);

        acl.createPermission(tokenWrapper, voting, voting.CREATE_VOTES_ROLE(), voting);

        //acl.grantPermission(voting, tokenWrapper, tokenWrapper.WRAP_ROLE());

        // Clean up permissions
        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        emit DeployInstance(dao);
    }
}
