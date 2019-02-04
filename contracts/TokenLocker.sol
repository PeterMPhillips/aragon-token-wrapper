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


contract TokenLocker is ITokenController, IForwarder, AragonApp {
    using SafeMath for uint256;
    using Uint256Helpers for uint256;

    bytes32 public constant LOCK_ROLE = keccak256("LOCK_ROLE");
    bytes32 public constant UNLOCK_ROLE = keccak256("UNLOCK_ROLE");

    string private constant ERROR_TOKEN_CONTROLLER = "TM_TOKEN_CONTROLLER";
    string private constant ERROR_MINT_BALANCE_INCREASE_NOT_ALLOWED = "TM_MINT_BAL_INC_NOT_ALLOWED";
    string private constant ERROR_CAN_NOT_FORWARD = "TM_CAN_NOT_FORWARD";
    string private constant ERROR_PROXY_PAYMENT_WRONG_SENDER = "TM_PROXY_PAYMENT_WRONG_SENDER";

    uint256 private constant MONTH = 2592000; //30 days in seconds

    MiniMeToken public token;
    ERC20 public erc20;
    uint256 public lockAmount;
    uint256 public maxAccountTokens;
    mapping(address => uint256) public lockStart;
    mapping(address => uint256) public lockExpiry;
    uint256[] public lockIntervals;
    uint256[] public tokenIntervals;

    /**
    * @notice Initialize Token Manager for `_token.symbol(): string`, whose tokens are `transferable ? 'not' : ''` transferable`_maxAccountTokens > 0 ? ' and limited to a maximum of ' + @tokenAmount(_token, _maxAccountTokens, false) + ' per account' : ''`
    * @param _token The MiniMetoken that is used for voting in the DAO
    * @param _erc20 The ERC20 token that is locked in order to receive voting tokens
    * @param _lockAmount The amount of ERC20 that is required to receive voting tokens
    * @param _lockIntervals An array of lock times (in months)
    * @param _tokenIntervals An array of token amounts given for locking ERC20s for the amount of time defined by _lockIntervals
    */
    function initialize(
        MiniMeToken _token,
        address _erc20,
        uint256 _lockAmount,
        uint256[] _lockIntervals,
        uint256[] _tokenIntervals
    )
        external

    {
        initialized();

        require(MiniMeToken(_token).controller() == address(this), ERROR_TOKEN_CONTROLLER);

        token = _token;
        token.enableTransfers(false);
        erc20 = ERC20(_erc20);
        lockAmount = _lockAmount;
        lockIntervals = _lockIntervals;
        tokenIntervals = _tokenIntervals;
    }

    /**
    * @notice lock
    */
    function lock(uint256 _lockTime) external {
      uint amount;
      uint expiry;
      if(token.balanceOf(msg.sender) == 0){
        require(erc20.transferFrom(msg.sender, address(this), lockAmount), 'Transfer from msg sender failed');
        lockStart[msg.sender] = now;
        (amount, expiry) = _calcLockingValues(_lockTime);
        require(expiry > 0);
        lockExpiry[msg.sender] = lockStart[msg.sender] + expiry;
      } else {
        //In this case we are updating the lock times and the user's voting tokens
        //Maximise expiry time to give user the max tokens they are entitled to
        expiry = _lockTime;
        if(expiry < lockExpiry[msg.sender]-lockStart[msg.sender]){
          expiry = lockExpiry[msg.sender]-lockStart[msg.sender];
        }
        if(expiry < now-lockStart[msg.sender]){
          expiry = now-lockStart[msg.sender];
        }
        //Get amount owed. _updateLockExpiry will subtract any voting tokens already minted
        amount = _updateLockExpiry(msg.sender, expiry);
      }
      require(amount > 0);
      token.generateTokens(msg.sender, amount); // minime.generateTokens() never returns false
    }

    /**
    * @notice unlock
    */
    function unlock() external {
      require(lockExpiry[msg.sender] < now, 'Tokens are still locked');
      token.destroyTokens(msg.sender, token.balanceOf(msg.sender));
      delete lockStart[msg.sender];
      delete lockExpiry[msg.sender];
      erc20.transfer(msg.sender, lockAmount);
    }

    function getLockIntervals() external view returns (uint256[]){
      return lockIntervals;
    }

    function getTokenIntervals() external view returns (uint256[]){
      return tokenIntervals;
    }

    /**
    *
    *
    */
    function _updateLockExpiry(address _user, uint256 _time)
    internal
    returns (uint256){
      require(lockStart[_user] > 0);
      (uint amount, uint lockInterval) = _calcLockingValues(_time);
      lockExpiry[msg.sender] = lockStart[msg.sender] + lockInterval;
      return amount.sub(token.balanceOf(_user));
    }

    /**
    *
    *
    */
    function _calcLockingValues(uint256 _lockTime)
    internal
    returns (uint256, uint256){
      //Reverse loop
      for(uint i=lockIntervals.length-1; i>=0; i--){
        if(_lockTime >= lockIntervals[i]){
          return(tokenIntervals[i], lockIntervals[i].mul(MONTH));
        }
      }
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
