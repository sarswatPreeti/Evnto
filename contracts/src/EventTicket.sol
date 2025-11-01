// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Verifier.sol";

/**
 * @title EventTicket
 * @dev Priority ticket minting with Zero-Knowledge proof verification
 * Allows Web3 contributors to mint priority tickets without revealing identity
 */
contract EventTicket is ERC721, Ownable, ReentrancyGuard {
    
    // Ticket tiers
    enum TicketTier {
        STANDARD,
        PRIORITY,
        VIP
    }
    
    // Ticket metadata
    struct Ticket {
        uint256 eventId;
        address holder;
        TicketTier tier;
        uint256 mintTime;
        bool isSoulbound;
        uint256 eventDate;
        string eventTitle;
    }
    
    // ZK Proof structure
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    
    // State variables
    Groth16Verifier public verifier;
    
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => mapping(address => bool)) public hasTicket;
    mapping(uint256 => mapping(address => bool)) public hasPriorityTicket;
    mapping(bytes32 => bool) public usedCommitments; // Prevent double minting
    mapping(address => uint256[]) public userTickets;
    
    uint256 public tokenCounter;
    uint256 public priorityTicketPrice;
    uint256 public standardTicketPrice;
    
    // Events
    event TicketMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed holder,
        TicketTier tier
    );
    
    event PriorityTicketMintedWithZK(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed holder,
        bytes32 commitment
    );
    
    /**
     * @dev Constructor
     * @param _verifierAddress Address of the ZK proof verifier contract
     */
    constructor(address _verifierAddress) 
        ERC721("Evnto Priority Ticket", "EVTKT") 
        Ownable(msg.sender) 
    {
        verifier = Groth16Verifier(_verifierAddress);
        priorityTicketPrice = 0.01 ether;
        standardTicketPrice = 0.05 ether;
    }
    
    /**
     * @dev Mint priority ticket for hackathon with ZK proof verification
     * @param proof The Groth16 ZK proof
     * @param publicSignals Public signals [commitment, isEligible]
     * @param eventId The event ID
     * @param eventTitle The event title
     * @param eventDate The event timestamp
     * 
     * Requirements:
     * - Valid ZK proof proving Web3 contributions
     * - Commitment not previously used (prevents double minting)
     * - User doesn't already have priority ticket for this event
     * - Event date is in the future
     */
    function mintPriorityTicketHackathon(
        Proof calldata proof,
        uint256[2] calldata publicSignals,
        uint256 eventId,
        string memory eventTitle,
        uint256 eventDate
    ) external payable nonReentrant returns (uint256) {
        // Extract commitment and eligibility from public signals
        uint256 commitment = publicSignals[0];
        uint256 isEligible = publicSignals[1];
        
        bytes32 commitmentHash = bytes32(commitment);
        
        // Validation checks
        require(msg.value >= priorityTicketPrice, "Insufficient payment");
        require(eventDate > block.timestamp, "Event must be in future");
        require(!hasPriorityTicket[eventId][msg.sender], "Already has priority ticket");
        require(!usedCommitments[commitmentHash], "Commitment already used");
        require(!hasTicket[eventId][msg.sender], "Already has ticket for event");
        
        // Verify ZK proof
        bool isValidProof = verifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );
        
        require(isValidProof, "Invalid ZK proof");
        require(isEligible == 1, "Not eligible for priority ticket");
        
        // Mark commitment as used to prevent double minting
        usedCommitments[commitmentHash] = true;
        
        // Mint ticket
        tokenCounter++;
        uint256 tokenId = tokenCounter;
        
        // Create soulbound ticket (locked until after event)
        tickets[tokenId] = Ticket({
            eventId: eventId,
            holder: msg.sender,
            tier: TicketTier.PRIORITY,
            mintTime: block.timestamp,
            isSoulbound: true,
            eventDate: eventDate,
            eventTitle: eventTitle
        });
        
        hasTicket[eventId][msg.sender] = true;
        hasPriorityTicket[eventId][msg.sender] = true;
        userTickets[msg.sender].push(tokenId);
        
        _safeMint(msg.sender, tokenId);
        
        emit PriorityTicketMintedWithZK(tokenId, eventId, msg.sender, commitmentHash);
        emit TicketMinted(tokenId, eventId, msg.sender, TicketTier.PRIORITY);
        
        return tokenId;
    }
    
    /**
     * @dev Mint priority ticket for concert with Spotify ZK proof verification
     * @param proof The Groth16 ZK proof
     * @param publicSignals Public signals [eventId, result, nullifier]
     * @param eventId The event ID
     * @param eventTitle The event title
     * @param eventDate The event timestamp
     * 
     * Requirements:
     * - Valid ZK proof proving user is a top fan of artist
     * - Nullifier not previously used (prevents double minting)
     * - User doesn't already have priority ticket for this event
     * - Event date is in the future
     */
    function mintPriorityTicketConcert(
        Proof calldata proof,
        uint256[3] calldata publicSignals,
        uint256 eventId,
        string memory eventTitle,
        uint256 eventDate
    ) external payable nonReentrant returns (uint256) {
        // Extract signals: [eventId, result, nullifier]
        uint256 signalEventId = publicSignals[0];
        uint256 result = publicSignals[1];
        uint256 nullifier = publicSignals[2];
        
        bytes32 nullifierHash = bytes32(nullifier);
        
        // Validation checks
        require(msg.value >= priorityTicketPrice, "Insufficient payment");
        require(eventDate > block.timestamp, "Event must be in future");
        require(signalEventId == eventId, "Event ID mismatch");
        require(!hasPriorityTicket[eventId][msg.sender], "Already has priority ticket");
        require(!usedCommitments[nullifierHash], "Nullifier already used");
        require(!hasTicket[eventId][msg.sender], "Already has ticket for event");
        
        // Verify ZK proof using Spotify verifier
        // Note: You may need a separate verifier contract for Spotify
        bool isValidProof = verifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicSignals
        );
        
        require(isValidProof, "Invalid ZK proof");
        require(result == 1, "Not a top fan of artist");
        
        // Mark nullifier as used to prevent double minting
        usedCommitments[nullifierHash] = true;
        
        // Mint ticket
        tokenCounter++;
        uint256 tokenId = tokenCounter;
        
        // Create soulbound ticket (locked until after event)
        tickets[tokenId] = Ticket({
            eventId: eventId,
            holder: msg.sender,
            tier: TicketTier.PRIORITY,
            mintTime: block.timestamp,
            isSoulbound: true,
            eventDate: eventDate,
            eventTitle: eventTitle
        });
        
        hasTicket[eventId][msg.sender] = true;
        hasPriorityTicket[eventId][msg.sender] = true;
        userTickets[msg.sender].push(tokenId);
        
        _safeMint(msg.sender, tokenId);
        
        emit PriorityTicketMintedWithZK(tokenId, eventId, msg.sender, nullifierHash);
        emit TicketMinted(tokenId, eventId, msg.sender, TicketTier.PRIORITY);
        
        return tokenId;
    }
    
    /**
     * @dev Mint standard ticket (no ZK proof required)
     */
    function mintStandardTicket(
        uint256 eventId,
        string memory eventTitle,
        uint256 eventDate
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= standardTicketPrice, "Insufficient payment");
        require(eventDate > block.timestamp, "Event must be in future");
        require(!hasTicket[eventId][msg.sender], "Already has ticket");
        
        tokenCounter++;
        uint256 tokenId = tokenCounter;
        
        tickets[tokenId] = Ticket({
            eventId: eventId,
            holder: msg.sender,
            tier: TicketTier.STANDARD,
            mintTime: block.timestamp,
            isSoulbound: false,
            eventDate: eventDate,
            eventTitle: eventTitle
        });
        
        hasTicket[eventId][msg.sender] = true;
        userTickets[msg.sender].push(tokenId);
        
        _safeMint(msg.sender, tokenId);
        
        emit TicketMinted(tokenId, eventId, msg.sender, TicketTier.STANDARD);
        
        return tokenId;
    }
    
    /**
     * @dev Override transfer to implement soulbound logic
     * Soulbound tickets cannot be transferred until after event
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Check soulbound restriction
        Ticket memory ticket = tickets[tokenId];
        if (ticket.isSoulbound) {
            require(
                block.timestamp >= ticket.eventDate,
                "Soulbound: ticket locked until after event"
            );
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Unlock soulbound ticket after event (manual override by owner)
     */
    function unlockSoulbound(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        tickets[tokenId].isSoulbound = false;
    }
    
    /**
     * @dev Get ticket details
     */
    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tickets[tokenId];
    }
    
    /**
     * @dev Get user's tickets
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return userTickets[user];
    }
    
    /**
     * @dev Check if commitment was used
     */
    function isCommitmentUsed(bytes32 commitment) external view returns (bool) {
        return usedCommitments[commitment];
    }
    
    /**
     * @dev Update ticket prices
     */
    function setPrices(uint256 _priorityPrice, uint256 _standardPrice) external onlyOwner {
        priorityTicketPrice = _priorityPrice;
        standardTicketPrice = _standardPrice;
    }
    
    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Update verifier contract
     */
    function setVerifier(address _verifierAddress) external onlyOwner {
        verifier = Groth16Verifier(_verifierAddress);
    }
    
    /**
     * @dev Token URI with metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        Ticket memory ticket = tickets[tokenId];
        string memory tierName = ticket.tier == TicketTier.PRIORITY ? "Priority" : "Standard";
        
        // In production, return IPFS URI with full metadata
        return string(abi.encodePacked(
            "data:application/json;base64,",
            "{",
            '"name":"', ticket.eventTitle, ' - ', tierName, ' Ticket",',
            '"description":"Event ticket with ZK-verified priority access",',
            '"tier":"', tierName, '",',
            '"soulbound":', ticket.isSoulbound ? "true" : "false",
            "}"
        ));
    }
}
