// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventNFT
 * @dev NFT contract for minting event attendance certificates
 */
contract EventNFT is ERC721, Ownable, ReentrancyGuard {
    struct NFTMetadata {
        uint256 eventId;
        string eventTitle;
        string eventLocation;
        uint256 eventDate;
        address attendee;
        uint256 mintTime;
        string imageURI;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(uint256 => mapping(address => bool)) public hasEventNFT;
    mapping(address => uint256[]) public userNFTs;

    uint256 public tokenCounter;
    address public eventManager;

    event NFTMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        string eventTitle
    );

    constructor(address _eventManager) ERC721("Evnto Event NFT", "EVNTO") Ownable(msg.sender) {
        eventManager = _eventManager;
    }

    modifier onlyEventManager() {
        require(msg.sender == eventManager, "Only EventManager can call this");
        _;
    }

    /**
     * @dev Mint an NFT for event attendance
     */
    function mintEventNFT(
        address _attendee,
        uint256 _eventId,
        string memory _eventTitle,
        string memory _eventLocation,
        uint256 _eventDate,
        string memory _imageURI
    ) external onlyEventManager returns (uint256) {
        require(!hasEventNFT[_eventId][_attendee], "NFT already minted for this event");

        tokenCounter++;
        uint256 tokenId = tokenCounter;

        nftMetadata[tokenId] = NFTMetadata({
            eventId: _eventId,
            eventTitle: _eventTitle,
            eventLocation: _eventLocation,
            eventDate: _eventDate,
            attendee: _attendee,
            mintTime: block.timestamp,
            imageURI: _imageURI
        });

        hasEventNFT[_eventId][_attendee] = true;
        userNFTs[_attendee].push(tokenId);

        _safeMint(_attendee, tokenId);

        emit NFTMinted(tokenId, _eventId, _attendee, _eventTitle);
        return tokenId;
    }

    /**
     * @dev Get NFT metadata
     */
    function getNFTMetadata(uint256 _tokenId) external view returns (NFTMetadata memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return nftMetadata[_tokenId];
    }

    /**
     * @dev Get user's NFTs
     */
    function getUserNFTs(address _user) external view returns (uint256[] memory) {
        return userNFTs[_user];
    }

    /**
     * @dev Check if user has NFT for specific event
     */
    function hasNFTForEvent(uint256 _eventId, address _user) external view returns (bool) {
        return hasEventNFT[_eventId][_user];
    }

    /**
     * @dev Update EventManager address (owner only)
     */
    function setEventManager(address _eventManager) external onlyOwner {
        eventManager = _eventManager;
    }

    /**
     * @dev Override tokenURI to return metadata
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return nftMetadata[_tokenId].imageURI;
    }

    /**
     * @dev Batch mint NFTs (for events with multiple attendees)
     */
    function batchMintEventNFTs(
        address[] memory _attendees,
        uint256 _eventId,
        string memory _eventTitle,
        string memory _eventLocation,
        uint256 _eventDate,
        string memory _imageURI
    ) external onlyEventManager returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](_attendees.length);

        for (uint256 i = 0; i < _attendees.length; i++) {
            if (!hasEventNFT[_eventId][_attendees[i]]) {
                tokenIds[i] = mintEventNFT(
                    _attendees[i],
                    _eventId,
                    _eventTitle,
                    _eventLocation,
                    _eventDate,
                    _imageURI
                );
            }
        }

        return tokenIds;
    }
}