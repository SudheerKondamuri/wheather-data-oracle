// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WeatherOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    // Events for Subgraph indexing
    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp);

    struct WeatherReport {
        string city;
        int256 temperature;
        string description;
        uint256 timestamp;
    }

    mapping(bytes32 => WeatherReport) public weatherReports;
    mapping(bytes32 => address) public requestToRequester;
    mapping(bytes32 => string) public requestToCity;

    bytes32 private jobId;
    uint256 private fee;

    constructor(address _link, address _oracle, bytes32 _jobId, uint256 _fee) Ownable() {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        jobId = _jobId;
        fee = _fee;
    }

    function requestWeather(string memory _city) public returns (bytes32 requestId) {
        require(LinkTokenInterface(chainlinkTokenAddress()).balanceOf(address(this)) >= fee, "Insufficient LINK");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        
        // Example: Fetching temperature from OpenWeatherMap via a custom bridge/job
        req.add("get", string(abi.encodePacked("https://api.openweathermap.org/data/2.5/weather?q=", _city, "&units=metric&appid=YOUR_API_KEY")));
        req.add("path", "main.temp");
        req.addInt("times", 100); // Convert float to int (e.g., 25.5 -> 2550)

        requestId = sendChainlinkRequest(req, fee);
        requestToRequester[requestId] = msg.sender;
        requestToCity[requestId] = _city;

        emit WeatherRequested(requestId, _city, msg.sender);
    }

    function fulfill(bytes32 _requestId, int256 _temperature) public recordChainlinkFulfillment(_requestId) {
        string memory city = requestToCity[_requestId];
        
        weatherReports[_requestId] = WeatherReport({
            city: city,
            temperature: _temperature,
            description: "Decentralized Oracle Update",
            timestamp: block.timestamp
        });

        emit WeatherReported(_requestId, city, _temperature, "Decentralized Oracle Update", block.timestamp);
    }

    function setJobId(bytes32 _jobId) public onlyOwner { jobId = _jobId; }
    function setFee(uint256 _fee) public onlyOwner { fee = _fee; }
}