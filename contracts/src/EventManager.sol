// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventManager
 * @dev Manages event creation, ticket sales, and attendee verification on Monad
 */
contract EventManager is Ownable, ReentrancyGuard {
    struct Event {
        uint256 id;
        string title;
        string description;
        string location;
        uint256 date;
        uint256 ticketPrice;
        uint256 maxAttendees;
        uint256 currentAttendees;
        address organizer;
        bool active;
        string metadataURI;
    }

    struct Ticket {
        uint256 eventId;
        address attendee;
        uint256 purchaseTime;
        bool used;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => bool)) public hasTicket;
    mapping(uint256 => Ticket) public tickets;
    mapping(address => uint256[]) public organizerEvents;
    mapping(address => uint256[]) public attendeeTickets;

    uint256 public eventCounter;
    uint256 public ticketCounter;
    uint256 public platformFeePercentage = 250; // 2.5%

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string title,
        uint256 ticketPrice,
        uint256 maxAttendees
    );

    event TicketPurchased(
        uint256 indexed eventId,
        uint256 indexed ticketId,
        address indexed attendee,
        uint256 price
    );

    event EventCancelled(uint256 indexed eventId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a new event
     */
    function createEvent(
        string memory _title,
        string memory _description,
        string memory _location,
        uint256 _date,
        uint256 _ticketPrice,
        uint256 _maxAttendees,
        string memory _metadataURI
    ) external returns (uint256) {
        require(_date > block.timestamp, "Event date must be in the future");
        require(_maxAttendees > 0, "Max attendees must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");

        eventCounter++;
        uint256 eventId = eventCounter;

        events[eventId] = Event({
            id: eventId,
            title: _title,
            description: _description,
            location: _location,
            date: _date,
            ticketPrice: _ticketPrice,
            maxAttendees: _maxAttendees,
            currentAttendees: 0,
            organizer: msg.sender,
            active: true,
            metadataURI: _metadataURI
        });

        organizerEvents[msg.sender].push(eventId);

        emit EventCreated(eventId, msg.sender, _title, _ticketPrice, _maxAttendees);
        return eventId;
    }

    /**
     * @dev Purchase a ticket for an event
     */
    function purchaseTicket(uint256 _eventId) external payable nonReentrant {
        Event storage event_ = events[_eventId];
        require(event_.active, "Event is not active");
        require(event_.date > block.timestamp, "Event has already passed");
        require(event_.currentAttendees < event_.maxAttendees, "Event is sold out");
        require(!hasTicket[_eventId][msg.sender], "Already has ticket for this event");
        require(msg.value >= event_.ticketPrice, "Insufficient payment");

        ticketCounter++;
        uint256 ticketId = ticketCounter;

        // Update event and ticket mappings
        event_.currentAttendees++;
        hasTicket[_eventId][msg.sender] = true;
        
        tickets[ticketId] = Ticket({
            eventId: _eventId,
            attendee: msg.sender,
            purchaseTime: block.timestamp,
            used: false
        });

        attendeeTickets[msg.sender].push(ticketId);

        // Handle payment
        if (event_.ticketPrice > 0) {
            uint256 platformFee = (event_.ticketPrice * platformFeePercentage) / 10000;
            uint256 organizerAmount = event_.ticketPrice - platformFee;

            // Transfer to organizer
            payable(event_.organizer).transfer(organizerAmount);
            
            // Platform fee stays in contract (can be withdrawn by owner)
        }

        // Refund excess payment
        if (msg.value > event_.ticketPrice) {
            payable(msg.sender).transfer(msg.value - event_.ticketPrice);
        }

        emit TicketPurchased(_eventId, ticketId, msg.sender, event_.ticketPrice);
    }

    /**
     * @dev Cancel an event (organizer only)
     */
    function cancelEvent(uint256 _eventId) external {
        Event storage event_ = events[_eventId];
        require(event_.organizer == msg.sender, "Only organizer can cancel");
        require(event_.active, "Event already cancelled");

        event_.active = false;
        emit EventCancelled(_eventId);
    }

    /**
     * @dev Check if address has ticket for event
     */
    function hasTicketFor(uint256 _eventId, address _attendee) external view returns (bool) {
        return hasTicket[_eventId][_attendee];
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 _eventId) external view returns (Event memory) {
        return events[_eventId];
    }

    /**
     * @dev Get events organized by an address
     */
    function getOrganizerEvents(address _organizer) external view returns (uint256[] memory) {
        return organizerEvents[_organizer];
    }

    /**
     * @dev Get tickets owned by an address
     */
    function getAttendeeTickets(address _attendee) external view returns (uint256[] memory) {
        return attendeeTickets[_attendee];
    }

    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee cannot exceed 10%"); // 10% max
        platformFeePercentage = _feePercentage;
    }

    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}