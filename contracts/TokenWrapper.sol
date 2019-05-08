/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

/* solium-disable function-order */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/common/Uint256Helpers.sol";

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

import "@aragon/apps-shared-minime/contracts/ITokenController.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";


contract TokenWrapper is ITokenController, IForwarder, AragonApp {
    using SafeMath for uint256;
    using Uint256Helpers for uint256;

    bytes32 public constant WRAP_ROLE = keccak256("WRAP_ROLE");
    bytes32 public constant UNWRAP_ROLE = keccak256("UNWRAP_ROLE");

    string private constant ERROR_TOKEN_CONTROLLER = "TM_TOKEN_CONTROLLER";
    string private constant ERROR_MINT_BALANCE_INCREASE_NOT_ALLOWED = "TM_MINT_BAL_INC_NOT_ALLOWED";
    string private constant ERROR_CAN_NOT_FORWARD = "TM_CAN_NOT_FORWARD";
    string private constant ERROR_ON_TRANSFER_WRONG_SENDER = "TM_TRANSFER_WRONG_SENDER";
    string private constant ERROR_PROXY_PAYMENT_WRONG_SENDER = "TM_PROXY_PAYMENT_WRONG_SENDER";

    MiniMeToken public token;
    ERC20 public erc20;

    /**
    * @notice Initialize Token Manager for `_token.symbol(): string`, whose tokens are `transferable ? 'not' : ''` transferable`_maxAccountTokens > 0 ? ' and limited to a maximum of ' + @tokenAmount(_token, _maxAccountTokens, false) + ' per account' : ''`
    * @param _token The MiniMetoken that is used for voting in the DAO
    * @param _erc20 The ERC20 token that is locked in order to receive voting tokens
    */
    function initialize(address _token, address _erc20, bool _transferable) external
    {
        initialized();

        require(MiniMeToken(_token).controller() == address(this), ERROR_TOKEN_CONTROLLER);

        erc20 = ERC20(_erc20);
        token = MiniMeToken(_token);
        if (token.transfersEnabled() != _transferable) {
            token.enableTransfers(_transferable);
        }
    }

    /**
    * @notice Wrap Tokens
    */
    function wrap(uint256 _amount) external {
      require(_amount > 0);
      require(erc20.balanceOf(msg.sender) >= _amount);
      require(erc20.transferFrom(msg.sender, address(this), _amount), 'Transfer from msg sender failed');
      token.generateTokens(msg.sender, _amount); // minime.generateTokens() never returns false
    }

    /**
    * @notice Unwrap Tokens
    */
    function unwrap(uint256 _amount) external {
      require(_amount > 0);
      require(token.balanceOf(msg.sender) >= _amount);
      token.destroyTokens(msg.sender, _amount);
      erc20.transfer(msg.sender, _amount);
    }

    /**
    * @notice Execute desired action as a token holder
    * @dev IForwarder interface conformance. Forwards any token holder action.
    * @param _evmScript Script being executed
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);
        bytes memory input = new bytes(0); // TODO: Consider input for this

        // Add the managed token to the blacklist to disallow a token holder from executing actions
        // on the token controller's (this contract) behalf
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(token);

        runScript(_evmScript, input, blacklist);
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        return hasInitialized() && token.balanceOf(_sender) > 0;
    }

    /*
    * @dev Notifies the controller about a token transfer allowing the controller to decide whether to allow it or react if desired (only callable from the token)
    * @param _from The origin of the transfer
    * @param _to The destination of the transfer
    * @param _amount The amount of the transfer
    * @return False if the controller does not authorize the transfer
    */
    function onTransfer(address _from, address _to, uint _amount) public isInitialized returns (bool) {
        require(msg.sender == address(token), ERROR_ON_TRANSFER_WRONG_SENDER);

        bool includesTokenManager = _from == address(this) || _to == address(this);

        if (!includesTokenManager) {
            if (token.balanceOf(_from) >= _amount) {
                return true;
            }
        }
        return false;
    }

    /**
    * @notice Called when ether is sent to the MiniMe Token contract
    * @return True if the ether is accepted, false for it to throw
    */
    function proxyPayment(address) public payable returns (bool) {
        // Sender check is required to avoid anyone sending ETH to the Token Manager through this method
        // Even though it is tested, solidity-coverage doesnt get it because
        // MiniMeToken is not instrumented and entire tx is reverted
        require(msg.sender == address(token), ERROR_PROXY_PAYMENT_WRONG_SENDER);
        return false;
    }

    /**
    * @dev Notifies the controller about an approval allowing the controller to react if desired
    * @return False if the controller does not authorize the approval
    */
    function onApprove(address, address, uint) public returns (bool) {
        return true;
    }

    /**
    * @dev Disable recovery escape hatch for own token,
    *      as the it has the concept of issuing tokens without assigning them
    */
    function allowRecoverability(address _token) public view returns (bool) {
        return _token != address(token);
    }
}
