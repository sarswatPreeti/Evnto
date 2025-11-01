// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventRewardToken
 * @dev ERC20 token for rewarding event attendance and engagement
 */
contract EventRewardToken is ERC20, Ownable {
    mapping(address => bool) public minters;
    mapping(uint256 => mapping(address => bool)) public hasClaimedReward;
    
    uint256 public constant ATTENDANCE_REWARD = 100 * 10**18; // 100 tokens
    uint256 public constant ORGANIZER_REWARD = 500 * 10**18; // 500 tokens
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1M tokens

    address public eventManager;

    event RewardClaimed(address indexed user, uint256 eventId, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    constructor(address _eventManager) ERC20("Evnto Reward Token", "EVNT") Ownable(msg.sender) {
        eventManager = _eventManager;
        minters[_eventManager] = true;
        
        // Mint initial supply to owner for distribution
        _mint(msg.sender, 100000 * 10**18); // 100K tokens for initial distribution
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Only minters can call this function");
        _;
    }

    /**
     * @dev Claim attendance reward
     */
    function claimAttendanceReward(uint256 _eventId, address _attendee) external onlyMinter {
        require(!hasClaimedReward[_eventId][_attendee], "Reward already claimed");
        require(totalSupply() + ATTENDANCE_REWARD <= MAX_SUPPLY, "Max supply exceeded");

        hasClaimedReward[_eventId][_attendee] = true;
        _mint(_attendee, ATTENDANCE_REWARD);

        emit RewardClaimed(_attendee, _eventId, ATTENDANCE_REWARD);
    }

    /**
     * @dev Claim organizer reward
     */
    function claimOrganizerReward(uint256 _eventId, address _organizer) external onlyMinter {
        require(!hasClaimedReward[_eventId][_organizer], "Reward already claimed");
        require(totalSupply() + ORGANIZER_REWARD <= MAX_SUPPLY, "Max supply exceeded");

        hasClaimedReward[_eventId][_organizer] = true;
        _mint(_organizer, ORGANIZER_REWARD);

        emit RewardClaimed(_organizer, _eventId, ORGANIZER_REWARD);
    }

    /**
     * @dev Custom mint function for special rewards
     */
    function mintReward(address _to, uint256 _amount) external onlyMinter {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(_to, _amount);
    }

    /**
     * @dev Add minter address
     */
    function addMinter(address _minter) external onlyOwner {
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }

    /**
     * @dev Remove minter address
     */
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }

    /**
     * @dev Check if user has claimed reward for event
     */
    function hasUserClaimedReward(uint256 _eventId, address _user) external view returns (bool) {
        return hasClaimedReward[_eventId][_user];
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    /**
     * @dev Burn tokens from address (with approval)
     */
    function burnFrom(address _from, uint256 _amount) external {
        uint256 currentAllowance = allowance(_from, msg.sender);
        require(currentAllowance >= _amount, "Burn amount exceeds allowance");
        
        _approve(_from, msg.sender, currentAllowance - _amount);
        _burn(_from, _amount);
    }
}