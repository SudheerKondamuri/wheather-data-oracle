// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WeatherOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    struct WeatherReport {
        string city;
        int256 temperature;
        string description;
        uint256 timestamp;
        address requester;
    }

    // Maps requestId to the requester address to retrieve it in fulfill
    mapping(bytes32 => address) private requestToSender;
    // Maps requestId to the city name
    mapping(bytes32 => string) private requestToCity;
    // Final storage
    mapping(bytes32 => WeatherReport) public weatherReports;

    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp);

    uint256 public fee;
    bytes32 public jobId;

    constructor(address _link, address _oracle, bytes32 _jobId, uint256 _fee) Ownable() {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        jobId = _jobId;
        fee = _fee; 
    }

    function requestWeather(string memory _city) public returns (bytes32 requestId) {
        require(LinkTokenInterface(chainlinkTokenAddress()).balanceOf(address(this)) >= fee, "Not enough LINK");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        
        // Example API setup (This depends on the Job/Adapter configuration)
        req.add("get", "https://api.openweathermap.org/data/2.5/weather?q=");
        req.add("path", "main.temp"); 
        
        requestId = sendChainlinkRequest(req, fee);
        
        requestToSender[requestId] = msg.sender;
        requestToCity[requestId] = _city;

        emit WeatherRequested(requestId, _city, msg.sender);
    }

    function fulfill(bytes32 _requestId, int256 _temperature) public recordChainlinkFulfillment(_requestId) {
        // For simplicity, we assume the Oracle returns temperature and we hardcode description
        // In production, multi-variable fulfillment is used for strings + ints
        string memory city = requestToCity[_requestId];
        address requester = requestToSender[_requestId];

        weatherReports[_requestId] = WeatherReport({
            city: city,
            temperature: _temperature,
            description: "Fetched via Chainlink",
            timestamp: block.timestamp,
            requester: requester
        });

        emit WeatherReported(_requestId, city, _temperature, "Fetched via Chainlink", block.timestamp);
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Transfer failed");
    }
}